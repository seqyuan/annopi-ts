export const COOKIE_NAME = "annopi-auth";

export async function verifyAuthToken(_token: string, _secret?: string): Promise<boolean> {
  return true;
}
