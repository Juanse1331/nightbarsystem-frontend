/**
 * api.ts — Capa de comunicación con el backend IroMarket-ISII (branch: alejo)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  MAPA DE ENDPOINTS REALES (config/urls.py)                              │
 * ├────────────────────────────────────────────────────────────────────────-┤
 * │  AUTH                                                                   │
 * │  POST  /api/users/login/               { email, password } → JWT tokens │
 * │  POST  /api/users/refresh/             { refresh }         → new access  │
 * │                                                                         │
 * │  USUARIOS                                                               │
 * │  GET   /api/users/usuarios/            lista (solo admin)               │
 * │  POST  /api/users/usuarios/registro/   registro nuevo usuario           │
 * │  GET   /api/users/roles/               lista de roles disponibles       │
 * │                                                                         │
 * │  PRODUCTOS (apps/products/urls.py → r'catalogo')                        │
 * │  GET   /api/products/catalogo/         lista productos disponibles      │
 * │                                                                         │
 * │  MESAS (apps/tables/urls.py → r'')                                      │
 * │  GET   /api/tables/                    lista mesas ordenadas por numero │
 * │                                                                         │
 * │  PEDIDOS (apps/orders/urls.py → r'')                                    │
 * │  GET   /api/orders/          queryset dinámico según rol del usuario    │
 * │         - Mesero    → sus pedidos, orden -creado_en                     │
 * │         - Bartender → pending + preparing, orden +creado_en (FIFO)     │
 * │         - Admin     → todos, orden -creado_en                           │
 * │  POST  /api/orders/          crear pedido (solo Mesero)                 │
 * │  PATCH /api/orders/{id}/cambiar_estado/  cambiar estado (Bartender)     │
 * │                                                                         │
 * │  STATS                                                                  │
 * │  GET   /api/stats/reportes/            lista reportes (solo Admin)      │
 * │  POST  /api/stats/reportes/generar_corte_hoy/  generar corte del día   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * NOTAS CLAVE DEL BACKEND:
 *  - USERNAME_FIELD = 'email' → el login usa EMAIL, no username
 *  - El token JWT contiene: email, nombre, username, rol (string del Rol.nombre)
 *  - Los roles son: 'Mesero', 'Bartender', 'Administrador' (con mayúscula)
 *  - perform_create en PedidoViewSet asigna mesero=request.user automáticamente
 *  - precio_unitario en DetallePedido es read_only (se toma de producto.precio)
 *  - El endpoint de cambiar estado es /cambiar_estado/ (acción personalizada)
 */

import {
  User,
  LoginResponse,
  Rol,
  Producto,
  Mesa,
  Pedido,
  EstadoPedido,
  DetallePedido,
  ReporteDiario,
} from '../types';

// ─── Configuración ─────────────────────────────────────────────────────────
// ⚠️  Cambia esta IP por la de tu PC en la red local (misma WiFi que el teléfono)
//     Windows: ejecuta `ipconfig` y busca "Dirección IPv4"
//     Mac/Linux: ejecuta `ifconfig` o `ip addr`
export const API_BASE = 'http://192.168.20.75:8000';

let accessToken: string | null = null;
let storedRefreshToken: string | null = null;

export const setTokens = (access: string, refresh: string): void => {
  accessToken = access;
  storedRefreshToken = refresh;
};

export const clearTokens = (): void => {
  accessToken = null;
  storedRefreshToken = null;
};

// ─── JWT decode (sin librería) ──────────────────────────────────────────────
// El backend inyecta: email, nombre, username, rol en el payload del token
export interface JwtPayload {
  email: string;
  nombre: string;
  username: string;
  rol: string;
  user_id: number;
  exp: number;
}

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
};

// ─── Helper de fetch ────────────────────────────────────────────────────────

export interface ApiError {
  status: number;
  data: unknown;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const options: RequestInit = { method, headers };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, options);

  // 204 No Content → sin body
  if (res.status === 204) return undefined as unknown as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw { status: res.status, data } as ApiError;
  }

  return data as T;
}

// ─── AUTH ───────────────────────────────────────────────────────────────────

/**
 * POST /api/users/login/
 * ⚠️  El backend usa USERNAME_FIELD = 'email'
 *     → siempre enviar email, no username
 * Retorna { access, refresh } (SimpleJWT estándar)
 * El token decodificado contiene { email, nombre, username, rol }
 */
export const login = (email: string, password: string): Promise<LoginResponse> =>
  request<LoginResponse>('POST', '/api/users/login/', { email, password });

/**
 * POST /api/users/refresh/
 * Renueva el access token con el refresh token
 */
export const refreshAccessToken = (): Promise<{ access: string }> =>
  request<{ access: string }>('POST', '/api/users/refresh/', {
    refresh: storedRefreshToken,
  });

// ─── USUARIOS ───────────────────────────────────────────────────────────────

/** GET /api/users/usuarios/ — lista todos los usuarios (requiere autenticación) */
export const getUsuarios = (): Promise<User[]> =>
  request<User[]>('GET', '/api/users/usuarios/');

/** GET /api/users/roles/ — lista roles disponibles (AllowAny) */
export const getRoles = (): Promise<Rol[]> =>
  request<Rol[]>('GET', '/api/users/roles/');

export interface UsuarioPublico {
  id: number;
  email: string;
  nombre: string | null;
  username: string;
}

/** GET /api/users/usuarios/por_rol/?rol=<rol> — lista usuarios activos por rol (AllowAny) */
export const getUsuariosPorRol = (rol: string): Promise<UsuarioPublico[]> =>
  request<UsuarioPublico[]>('GET', `/api/users/usuarios/por_rol/?rol=${encodeURIComponent(rol)}`);

// ─── PRODUCTOS ──────────────────────────────────────────────────────────────

/**
 * GET /api/products/catalogo/
 * - Mesero/Bartender → solo productos con disponible=True
 * - Admin            → todos los productos
 */
export const getProductos = (): Promise<Producto[]> =>
  request<Producto[]>('GET', '/api/products/catalogo/');

// ─── MESAS ──────────────────────────────────────────────────────────────────

/**
 * GET /api/tables/
 * Retorna mesas ordenadas por 'numero'
 * Campos: id, numero, capacidad, estado ('available' | 'occupied')
 */
export const getMesas = (): Promise<Mesa[]> =>
  request<Mesa[]>('GET', '/api/tables/');

/**
 * PATCH /api/tables/{id}/cambiar_estado/
 * Body: { estado: 'available' | 'occupied' }
 * Solo Mesero y Administrador pueden cambiar estado de mesa
 */
export const cambiarEstadoMesa = (
  id: number,
  estado: 'available' | 'occupied',
): Promise<{ message: string; mesa: number; nuevo_estado: string }> =>
  request('PATCH', `/api/tables/${id}/cambiar_estado/`, { estado });

// ─── PEDIDOS ────────────────────────────────────────────────────────────────

/**
 * GET /api/orders/
 * Queryset dinámico según rol (ver notas arriba del archivo)
 * El mesero ve solo sus pedidos. El bartender ve pending+preparing (FIFO).
 */
export const getPedidos = (): Promise<Pedido[]> =>
  request<Pedido[]>('GET', '/api/orders/');

/**
 * POST /api/orders/
 * Solo IsMesero puede crear pedidos.
 * El mesero NO necesita enviar su ID → perform_create lo asigna del token.
 * Body: { mesa: number, detalles: [{ producto: number, cantidad: number }] }
 * ⚠️  precio_unitario es read_only → NO enviarlo, el backend lo toma del catálogo
 */
export const crearPedido = (
  mesa: number,
  detalles: { producto: number; cantidad: number }[],
): Promise<Pedido> =>
  request<Pedido>('POST', '/api/orders/', { mesa, detalles });

/**
 * PATCH /api/orders/{id}/cambiar_estado/
 * Solo Bartender (y Admin en emergencia) puede cambiar estados.
 * Body: { estado: 'pending' | 'preparing' | 'delivered' }
 */
export const cambiarEstadoPedido = (
  id: number,
  estado: EstadoPedido,
): Promise<{ message: string; pedido_id: number; nuevo_estado: string }> =>
  request('PATCH', `/api/orders/${id}/cambiar_estado/`, { estado });

// ─── STATS ──────────────────────────────────────────────────────────────────

/**
 * GET /api/stats/reportes/
 * Lista reportes diarios (solo EsAdministrador)
 */
export const getReportes = (): Promise<ReporteDiario[]> =>
  request<ReporteDiario[]>('GET', '/api/stats/reportes/');

/**
 * POST /api/stats/reportes/generar_corte_hoy/
 * Genera o actualiza el reporte del día actual (solo EsAdministrador)
 */
export const generarCorteDiario = (): Promise<{
  mensaje: string;
  reporte: ReporteDiario;
}> =>
  request('POST', '/api/stats/reportes/generar_corte_hoy/');
