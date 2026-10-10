import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { secret, code } = await req.json();

    if (!secret || !code) {
      return Response.json({ error: 'Secret and code required' }, { status: 400 });
    }

    const isValid = await validateTOTP(secret, code);

    return Response.json({ valid: isValid });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function validateTOTP(secret, token) {
  const window = 1;
  const time = Math.floor(Date.now() / 30000);

  for (let i = -window; i <= window; i++) {
    const calculatedToken = await generateTOTP(secret, time + i);
    if (calculatedToken === token) {
      return true;
    }
  }
  return false;
}

async function generateTOTP(secret, time) {
  const key = base32Decode(secret);
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setBigUint64(0, BigInt(time), false);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, timeBuffer);
  const signatureArray = new Uint8Array(signature);
  
  const offset = signatureArray[signatureArray.length - 1] & 0x0f;
  const code = (
    ((signatureArray[offset] & 0x7f) << 24) |
    ((signatureArray[offset + 1] & 0xff) << 16) |
    ((signatureArray[offset + 2] & 0xff) << 8) |
    (signatureArray[offset + 3] & 0xff)
  ) % 1000000;

  return code.toString().padStart(6, "0");
}

function base32Decode(base32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleanedBase32 = base32.toUpperCase().replace(/=+$/, "");
  const bits = cleanedBase32.split("").map(char => {
    const val = alphabet.indexOf(char);
    if (val === -1) throw new Error("Invalid base32 character");
    return val.toString(2).padStart(5, "0");
  }).join("");

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return new Uint8Array(bytes);
}