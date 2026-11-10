export function isActiveMember(data: { is_active: boolean }): boolean {
  return data.is_active === true;
}
