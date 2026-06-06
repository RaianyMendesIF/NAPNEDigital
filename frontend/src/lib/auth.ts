export type AppRole = "coordenador" | "acompanhante";

export function cargoToAppRole(cargo: string): AppRole {
  if (cargo === "Coordenador") return "coordenador";
  if (cargo === "Acompanhante" || cargo === "Agente") return "acompanhante";
  return "acompanhante";
}

export function appRoleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    coordenador: "Coordenador",
    acompanhante: "Acompanhante",
  };
  return labels[role];
}

export function cargoDisplayLabel(cargo: string): string {
  if (cargo === "Coordenador") return "Coordenador NAPNE";
  if (cargo === "Acompanhante" || cargo === "Agente") return "Acompanhante";
  return cargo;
}
