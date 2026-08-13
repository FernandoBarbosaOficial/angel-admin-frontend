import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const ADMIN_TOKEN_STORAGE_KEY = "agendai_admin_token";
const ADMIN_USER_STORAGE_KEY = "agendai_admin_user";
const MATRIX_HOST_ATTRIBUTE = "data-angel-menu-permissions-matrix-host";

type AdminMenuProfile =
  | "super_admin"
  | "cliente_admin"
  | "cliente_operador";

type AdminMenuKey =
  | "operation_realtime"
  | "daily_operations"
  | "appointment_control"
  | "conversations"
  | "confirmations";

type AdminMenuPermissionMap = Record<AdminMenuKey, boolean>;

type StoredAdminUser = {
  perfil?: "global" | "clinica";
  tipoUsuario?: AdminMenuProfile;
};

type AdminAccessScope = {
  isGlobalAdmin?: boolean;
  menuPermissions?: Partial<AdminMenuPermissionMap>;
};

type MenuDefinition = {
  key: AdminMenuKey;
  label: string;
};

type MenuProfileRow = {
  tipoUsuario: AdminMenuProfile;
  label: string;
  locked: boolean;
  permissions: AdminMenuPermissionMap;
};

type MenuPermissionMatrix = {
  menus: MenuDefinition[];
  profiles: MenuProfileRow[];
};

const MENU_ORDER: AdminMenuKey[] = [
  "operation_realtime",
  "daily_operations",
  "appointment_control",
  "conversations",
  "confirmations",
];

const MENU_TEXT: Record<AdminMenuKey, string> = {
  operation_realtime: "operacao em tempo real",
  daily_operations: "visao do dia",
  appointment_control: "controle de agendamento",
  conversations: "conversas",
  confirmations: "confirmacoes",
};

function getToken() {
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || "";
}

function readStoredUser(): StoredAdminUser | null {
  try {
    const raw = window.localStorage.getItem(ADMIN_USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAdminUser) : null;
  } catch {
    return null;
  }
}

function normalizeText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function menuKeyFromButton(button: HTMLButtonElement): AdminMenuKey | null {
  const text = normalizeText(button.textContent);
  return MENU_ORDER.find((key) => text.includes(MENU_TEXT[key])) || null;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok || payload?.ok === false) {
    throw new Error(
      payload?.details ||
        payload?.error ||
        payload?.message ||
        `Falha HTTP ${response.status}`,
    );
  }

  return (payload && typeof payload === "object" && "data" in payload
    ? payload.data
    : payload) as T;
}

function checkboxStyle(checked: boolean, disabled: boolean): React.CSSProperties {
  return {
    width: 20,
    height: 20,
    margin: 0,
    cursor: disabled ? "not-allowed" : "pointer",
    accentColor: checked ? "#2563eb" : undefined,
  };
}

export default function AdminMenuPermissionsBridge() {
  const [currentUser, setCurrentUser] = useState<StoredAdminUser | null>(() => readStoredUser());
  const [accessScope, setAccessScope] = useState<AdminAccessScope | null>(null);
  const [matrixHost, setMatrixHost] = useState<HTMLElement | null>(null);
  const [matrix, setMatrix] = useState<MenuPermissionMatrix | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixError, setMatrixError] = useState("");
  const [savingCell, setSavingCell] = useState("");
  const lastScopeTokenRef = useRef("");

  const refreshAccessScope = useCallback(async () => {
    const token = getToken();
    const user = readStoredUser();
    setCurrentUser(user);
    lastScopeTokenRef.current = token;

    if (!token || !user) {
      setAccessScope(null);
      return;
    }

    try {
      const scope = await apiRequest<AdminAccessScope>("/api/admin/auth/access-scope");
      setAccessScope(scope);
    } catch {
      // O painel legado continua responsável pela expiração/autenticação da sessão.
      setAccessScope(null);
    }
  }, []);

  useEffect(() => {
    void refreshAccessScope();
    const timer = window.setInterval(() => void refreshAccessScope(), 30000);
    return () => window.clearInterval(timer);
  }, [refreshAccessScope]);

  const isSuperAdmin =
    currentUser?.tipoUsuario === "super_admin" ||
    (currentUser?.perfil === "global" && accessScope?.isGlobalAdmin === true);

  const canAccessMenu = useCallback(
    (key: AdminMenuKey) => {
      if (isSuperAdmin) return true;
      if (!accessScope?.menuPermissions) return true;
      return accessScope.menuPermissions[key] !== false;
    },
    [accessScope?.menuPermissions, isSuperAdmin],
  );

  const allowedOperationCount = useMemo(
    () => MENU_ORDER.filter((key) => canAccessMenu(key)).length,
    [canAccessMenu],
  );

  useEffect(() => {
    let disposed = false;

    function ensureFreshSessionScope() {
      const token = getToken();
      if (token && token !== lastScopeTokenRef.current) {
        void refreshAccessScope();
      }
    }

    function attachMatrixHost() {
      const existing = document.querySelector<HTMLElement>(`[${MATRIX_HOST_ATTRIBUTE}]`);
      if (existing?.isConnected) {
        setMatrixHost((current) => (current === existing ? current : existing));
        return;
      }

      if (!isSuperAdmin) {
        setMatrixHost(null);
        return;
      }

      const usersGrid = document.querySelector<HTMLElement>(".usersAdminGrid");
      if (!usersGrid) {
        setMatrixHost(null);
        return;
      }

      const host = document.createElement("div");
      host.setAttribute(MATRIX_HOST_ATTRIBUTE, "true");
      host.style.gridColumn = "1 / -1";
      host.style.minWidth = "0";
      usersGrid.prepend(host);
      setMatrixHost(host);
    }

    function applyMenuVisibility() {
      ensureFreshSessionScope();
      const navs = Array.from(document.querySelectorAll<HTMLElement>("nav"));

      for (const nav of navs) {
        const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>("button"));
        let activeDenied: HTMLButtonElement | null = null;

        for (const button of buttons) {
          const key = menuKeyFromButton(button);
          if (!key) continue;
          const allowed = canAccessMenu(key);

          if (allowed) {
            if (button.dataset.angelMenuPermissionHidden === "true") {
              button.style.removeProperty("display");
              button.removeAttribute("aria-hidden");
              button.removeAttribute("tabindex");
              delete button.dataset.angelMenuPermissionHidden;
            }
          } else {
            if (button.classList.contains("navActive")) activeDenied = button;
            button.style.setProperty("display", "none", "important");
            button.setAttribute("aria-hidden", "true");
            button.setAttribute("tabindex", "-1");
            button.dataset.angelMenuPermissionHidden = "true";
          }
        }

        const sectionLabels = Array.from(nav.querySelectorAll<HTMLElement>(".navSectionLabel"));
        for (const label of sectionLabels) {
          if (normalizeText(label.textContent) !== "operacao clinica") continue;
          label.style.display = allowedOperationCount > 0 ? "" : "none";
        }

        if (activeDenied) {
          const preferred = MENU_ORDER
            .map((key) =>
              buttons.find(
                (button) => menuKeyFromButton(button) === key && canAccessMenu(key),
              ),
            )
            .find(Boolean);

          const fallback = buttons.find((button) => {
            const key = menuKeyFromButton(button);
            return !button.disabled && (!key || canAccessMenu(key));
          });

          const next = preferred || fallback;
          if (next && next !== activeDenied) {
            window.setTimeout(() => {
              if (!disposed && next.isConnected) next.click();
            }, 0);
          }
        }
      }
    }

    function syncDom() {
      if (disposed) return;
      applyMenuVisibility();
      attachMatrixHost();
    }

    syncDom();
    const observer = new MutationObserver(syncDom);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [allowedOperationCount, canAccessMenu, isSuperAdmin, refreshAccessScope]);

  const loadMatrix = useCallback(async () => {
    if (!isSuperAdmin) return;
    setMatrixLoading(true);
    setMatrixError("");
    try {
      const data = await apiRequest<MenuPermissionMatrix>("/api/admin/perfis/menu-permissoes");
      setMatrix(data);
    } catch (error) {
      setMatrixError(error instanceof Error ? error.message : "Não foi possível carregar as permissões.");
    } finally {
      setMatrixLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!matrixHost || !isSuperAdmin) return;
    void loadMatrix();
  }, [isSuperAdmin, loadMatrix, matrixHost]);

  async function updatePermission(
    profile: MenuProfileRow,
    menu: MenuDefinition,
    permitido: boolean,
  ) {
    if (profile.locked || profile.tipoUsuario === "super_admin") return;
    const cellKey = `${profile.tipoUsuario}:${menu.key}`;
    setSavingCell(cellKey);
    setMatrixError("");

    try {
      const next = await apiRequest<MenuPermissionMatrix>(
        `/api/admin/perfis/menu-permissoes/${encodeURIComponent(profile.tipoUsuario)}/${encodeURIComponent(menu.key)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ permitido }),
        },
      );
      setMatrix(next);
      window.dispatchEvent(new CustomEvent("angel-menu-permissions-changed"));
      await refreshAccessScope();
    } catch (error) {
      setMatrixError(error instanceof Error ? error.message : "Não foi possível salvar a permissão.");
      await loadMatrix();
    } finally {
      setSavingCell("");
    }
  }

  const matrixPortal = matrixHost && isSuperAdmin
    ? createPortal(
        <section className="card" style={{ width: "100%", margin: 0 }}>
          <div className="sectionHeader">
            <div>
              <h3>Permissões de menu por perfil</h3>
              <p>
                Defina quais áreas operacionais aparecem para cada perfil. A proteção também é validada pelo backend.
              </p>
            </div>
            <button type="button" className="secondary" onClick={() => void loadMatrix()} disabled={matrixLoading || Boolean(savingCell)}>
              {matrixLoading ? "Atualizando..." : "Atualizar permissões"}
            </button>
          </div>

          <div className="helperBox compactHelper">
            <strong>Administrador técnico</strong> mantém acesso integral e não pode ser bloqueado. Alterações nos demais perfis valem para os usuários daquele perfil.
          </div>

          {matrixError && <div className="alertError">{matrixError}</div>}

          {matrixLoading && !matrix ? (
            <div className="emptyState">Carregando matriz de permissões...</div>
          ) : matrix ? (
            <div className="tableWrap" style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 190 }}>Perfil</th>
                    {matrix.menus.map((menu) => (
                      <th key={menu.key} style={{ minWidth: 150, textAlign: "center" }}>{menu.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.profiles.map((profile) => (
                    <tr key={profile.tipoUsuario}>
                      <td>
                        <strong>{profile.label}</strong>
                        <span className="tableHint">
                          {profile.locked ? "Acesso integral fixo" : profile.tipoUsuario === "cliente_admin" ? "Gestão da clínica" : "Operação da clínica"}
                        </span>
                      </td>
                      {matrix.menus.map((menu) => {
                        const checked = profile.permissions[menu.key] === true;
                        const cellKey = `${profile.tipoUsuario}:${menu.key}`;
                        const disabled = profile.locked || savingCell === cellKey || Boolean(savingCell && savingCell !== cellKey);
                        return (
                          <td key={menu.key} style={{ textAlign: "center" }}>
                            <label
                              title={profile.locked ? "Administrador técnico mantém acesso integral" : `${checked ? "Desativar" : "Ativar"} ${menu.label}`}
                              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                style={checkboxStyle(checked, disabled)}
                                onChange={(event) => void updatePermission(profile, menu, event.target.checked)}
                              />
                              <span style={{ fontSize: 12, color: checked ? "#166534" : "#64748b" }}>
                                {savingCell === cellKey ? "Salvando..." : checked ? "Liberado" : "Oculto"}
                              </span>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="emptyState">Permissões ainda não carregadas.</div>
          )}
        </section>,
        matrixHost,
      )
    : null;

  return matrixPortal;
}
