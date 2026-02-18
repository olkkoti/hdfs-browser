import { readFileSync } from "fs";

export interface AuthProvider {
  authenticate(username: string, password: string): Promise<boolean>;
}

interface UserEntry {
  username: string;
  password: string;
}

class LocalAuthProvider implements AuthProvider {
  private users: UserEntry[];

  constructor() {
    const usersPath = process.env.LOCAL_USERS_FILE;
    if (!usersPath)
      throw new Error(
        "LOCAL_USERS_FILE environment variable is required when AUTH_MODE=local"
      );
    const file = JSON.parse(readFileSync(usersPath, "utf-8")) as {
      users: UserEntry[];
    };
    this.users = file.users;
  }

  async authenticate(username: string, password: string): Promise<boolean> {
    return this.users.some(
      (u) => u.username === username && u.password === password
    );
  }
}

class LdapAuthProvider implements AuthProvider {
  private url: string;
  private userDnPattern: string;
  private startTls: boolean;
  private caCert: string | undefined;

  constructor() {
    const url = process.env.LDAP_URL;
    const userDnPattern = process.env.LDAP_USER_DN_PATTERN;

    if (!url) throw new Error("LDAP_URL is required when AUTH_MODE=ldap");
    if (!userDnPattern)
      throw new Error(
        "LDAP_USER_DN_PATTERN is required when AUTH_MODE=ldap"
      );

    this.url = url;
    this.userDnPattern = userDnPattern;
    this.startTls = process.env.LDAP_STARTTLS === "true";
    this.caCert = process.env.LDAP_CA_CERT;
  }

  async authenticate(username: string, password: string): Promise<boolean> {
    const { Client } = await import("ldapts");
    const dn = this.userDnPattern.replace("%s", username);

    const tlsOptions: Record<string, unknown> = {};
    if (this.caCert) {
      tlsOptions.ca = [readFileSync(this.caCert)];
    }

    const client = new Client({
      url: this.url,
      timeout: 10_000,
      connectTimeout: 10_000,
      tlsOptions,
    });

    try {
      if (this.startTls) {
        await client.startTLS(tlsOptions);
      }
      await client.bind(dn, password);
      return true;
    } catch (err: unknown) {
      const code = (err as { code?: number }).code;
      // LDAP error code 49 = invalid credentials
      if (code === 49) return false;
      // InvalidCredentialsError from ldapts
      if (err instanceof Error && err.name === "InvalidCredentialsError")
        return false;
      console.error("LDAP authentication error:", err);
      throw err;
    } finally {
      try {
        await client.unbind();
      } catch {
        // ignore unbind errors
      }
    }
  }
}

let provider: AuthProvider | undefined;

export function getAuthProvider(): AuthProvider {
  if (!provider) {
    const mode = process.env.AUTH_MODE || "local";
    if (mode === "ldap") {
      provider = new LdapAuthProvider();
    } else {
      provider = new LocalAuthProvider();
    }
  }
  return provider;
}
