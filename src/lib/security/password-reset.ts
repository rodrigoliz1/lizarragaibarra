export function isPasswordResetTokenUsable(
  token: {
    userId: string | null;
    type: string;
    expiresAt: Date;
    usedAt: Date | null;
  } | null,
  now = new Date(),
) {
  return Boolean(
    token &&
    token.userId &&
    token.type === "PASSWORD_RESET" &&
    !token.usedAt &&
    token.expiresAt > now,
  );
}
