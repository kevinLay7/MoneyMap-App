import Constants from "expo-constants";
import database from "@/model/database";

const DEVICE_CLIENT_ID_KEY = "device_client_id";

/**
 * Generates a simple random string
 */
function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Gets or generates a unique device client ID.
 * The ID is generated once per device installation and stored persistently.
 * It combines the installation ID with a generated random string for uniqueness.
 */
export async function getDeviceClientId(): Promise<string> {
  // Check if we already have a stored client ID
  const existingId = await database.localStorage.get(DEVICE_CLIENT_ID_KEY);
  if (existingId && typeof existingId === "string") {
    return existingId;
  }

  // Generate a new client ID
  // Use installationId from expo-constants (unique per app installation)
  // Combine with a generated random string for additional uniqueness
  const installationId = Constants.installationId || generateRandomString(16);
  const randomSuffix = generateRandomString(16);
  const clientId = `${installationId}-${randomSuffix}`;

  // Store it for future use
  await database.localStorage.set(DEVICE_CLIENT_ID_KEY, clientId);

  return clientId;
}

