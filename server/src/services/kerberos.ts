import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

let kerberosModule: typeof import("kerberos") | null = null;
let initialized = false;
let reinitTimer: ReturnType<typeof setInterval> | null = null;

const KRB5_PRINCIPAL = process.env.KRB5_PRINCIPAL || "";
const KRB5_KEYTAB = process.env.KRB5_KEYTAB || "";
const REINIT_INTERVAL_MS = 8 * 60 * 60 * 1000; // re-kinit every 8 hours

async function kinit(): Promise<void> {
  await execFileAsync("kinit", ["-kt", KRB5_KEYTAB, KRB5_PRINCIPAL]);
}

export async function init(): Promise<void> {
  if (!KRB5_PRINCIPAL || !KRB5_KEYTAB) {
    throw new Error("KRB5_PRINCIPAL and KRB5_KEYTAB must be set for Kerberos auth");
  }

  kerberosModule = await import("kerberos");

  await kinit();
  console.log(`Kerberos: kinit succeeded for ${KRB5_PRINCIPAL}`);
  initialized = true;

  // Periodically refresh the TGT
  reinitTimer = setInterval(async () => {
    try {
      await kinit();
      console.log(`Kerberos: TGT refreshed for ${KRB5_PRINCIPAL}`);
    } catch (err) {
      console.error("Kerberos: TGT refresh failed:", err);
    }
  }, REINIT_INTERVAL_MS);
  reinitTimer.unref();
}

export async function getSPNEGOToken(serviceFqdn: string): Promise<string> {
  if (!initialized || !kerberosModule) {
    throw new Error("Kerberos not initialized");
  }

  try {
    const client = await kerberosModule.initializeClient(`HTTP@${serviceFqdn}`, {
      mechOID: kerberosModule.GSS_MECH_OID_SPNEGO,
    });
    const token = await client.step("");
    return token;
  } catch (err: unknown) {
    // If token generation fails, try re-kinit and retry once
    console.warn("Kerberos: SPNEGO token generation failed, attempting re-kinit:", err);
    await kinit();
    const client = await kerberosModule.initializeClient(`HTTP@${serviceFqdn}`, {
      mechOID: kerberosModule.GSS_MECH_OID_SPNEGO,
    });
    const token = await client.step("");
    return token;
  }
}
