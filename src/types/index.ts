// ─── Tipos exactos según el backend IroMarket-ISII (branch: alejo) ───────────

// ── Roles ─────────────────────────────────────────────────────────────────────
// Rol.MESERO = 'Mesero' | Rol.BARTENDER = 'Bartender' | Rol.ADMINISTRADOR = 'Administrador'
export type UserRole = 'Mesero' | 'Bartender' | 'Administrador';

// ── Usuario ───────────────────────────────────────────────────────────────────
// CustomTokenObtainPairSerializer inyecta: email, nombre, username, rol (nombre del rol)
export interface User {
  id?: number;
  email: string;
  nombre: string | null;
  username: string;
  rol: UserRole;           // viene del token JWT como string (Rol.nombre)
  numero_telefono?: string | null;
  is_active?: boolean;
}

// Respuesta del login: access + refresh (JWT estándar de SimpleJWT)
export interface LoginResponse {
  access: string;
  refresh: string;
}

// ── Rol ───────────────────────────────────────────────────────────────────────
export interface Rol {
  id: number;
  nombre: UserRole;
}

// ── Producto ──────────────────────────────────────────────────────────────────
// ProductoSerializer: id, nombre, descripcion, precio, stock, disponible,
//                     categoria, categoria_nombre, imagen, creado_en
export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: string;            // DecimalField → string en DRF (ej: "8.00")
  stock: number;
  disponible: boolean;
  categoria: number;         // FK id
  categoria_nombre?: string; // read_only
  imagen: string | null;
  creado_en?: string;
}

// ── Mesa ──────────────────────────────────────────────────────────────────────
// TableSerializer: id, numero, capacidad, estado
export interface Mesa {
  id: number;
  numero: number;
  capacidad: number;
  estado: 'available' | 'occupied';
}

// ── Pedido ────────────────────────────────────────────────────────────────────
export type EstadoPedido = 'pending' | 'preparing' | 'delivered';

// DetallePedidoSerializer: id, producto (FK id), nombre_producto, cantidad,
//                           precio_unitario, subtotal
export interface DetallePedido {
  id?: number;
  producto: number;           // FK id
  nombre_producto?: string;   // read_only source='producto.nombre'
  cantidad: number;
  precio_unitario?: string;   // read_only (se toma del catálogo al crear)
  subtotal?: string;          // read_only @property
}

// PedidoSerializer: id, mesa, numero_mesa, mesero, nombre_mesero,
//                   estado, detalles, total, creado_en
export interface Pedido {
  id: number;
  mesa: number;               // FK id
  numero_mesa?: number;       // read_only source='mesa.numero'
  mesero?: number;            // FK id (read_only, se asigna del token)
  nombre_mesero?: string;     // read_only source='mesero.nombre'
  estado: EstadoPedido;
  detalles: DetallePedido[];
  total?: string;             // read_only @property total_pedido
  creado_en?: string;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
// ReporteDiarioSerializer: todos los campos del modelo
export interface ReporteDiario {
  id: number;
  fecha: string;
  ingresos_totales: string | number;
  pedidos_completados: number;
  producto_estrella: string;
  mesero_destacado: string;
}

// ── Navegación ────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  RoleSelector: undefined;
  MeseroLogin: undefined;
  MeseroHome: undefined;
  BartenderLogin: undefined;
  BartenderHome: undefined;
  AdminLogin: undefined;
  AdminHome: undefined;
};
