# 🍹 NightbarApp — React Native + TypeScript (Expo SDK 54)

Frontend móvil para **NightBarSystemt** — conecta meseros, bartenders y administradores con el backend Django ya implementado.

---

## 📁 Estructura del proyecto

```
NightbarApp/
├── App.tsx                              # Entry point
├── tsconfig.json                        # TypeScript config (strict mode)
├── babel.config.js
├── expo-env.d.ts
└── src/
    ├── types/
    │   └── index.ts                     # Todos los tipos: User, Order, Product, etc.
    ├── services/
    │   └── api.ts                       # Capa de API — tipada completa
    ├── context/
    │   └── AuthContext.tsx              # Estado global de auth (JWT)
    ├── navigation/
    │   └── AppNavigator.tsx             # Stack navigator + tipos de rutas
    ├── theme.ts                         # Colores, tipografía, espaciado, estilos globales
    ├── components/
    │   └── QuickLoginList.tsx           # Componente reutilizable (Mesero + Bartender)
    └── screens/
        ├── RoleSelector.tsx             # Pantalla inicial — selecciona Mesero/Bartender/Admin
        ├── MeseroLogin.tsx              # Login rápido 1 toque
        ├── MeseroHome.tsx               # Crear pedidos + historial
        ├── BartenderLogin.tsx           # Login rápido 1 toque
        ├── BartenderHome.tsx            # Cola Kanban + auto-refresh cada 8s
        ├── AdminLogin.tsx               # Login con email + contraseña
        └── AdminHome.tsx                # Estadísticas + gráficas + top bebidas
```

---

## 🚀 Instalación

### 1. Requisitos
- Node.js 18+
- Instala Expo CLI: `npm install -g expo-cli`
- App **Expo Go** en tu teléfono

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar la URL del backend
Edita `src/services/api.ts` y cambia `BASE_URL`:
```ts
const BASE_URL = 'http://TU_IP_LOCAL:8000/api';
```

> ⚠️ El teléfono y la PC deben estar en la **misma red WiFi**.
> - Windows: `ipconfig` → busca "Dirección IPv4"
> - Mac/Linux: `ifconfig` o `ip addr`

### 4. Correr la app
```bash
npm start
```
Escanea el QR con **Expo Go** en tu teléfono.

### 5. Verificar tipos (opcional)
```bash
npm run typecheck
```

---

## 🔑 Usuarios de prueba

En el Django Admin (`/admin/`) crea estos usuarios:

| Username | Password  | Rol        |
|----------|-----------|------------|
| `carlos` | `carlos`  | mesero     |
| `ana`    | `ana`     | mesero     |
| `pedro`  | `pedro`   | bartender  |
| `maria`  | `maria`   | bartender  |
| `admin`  | `admin123`| admin      |

> Para meseros y bartenders, el modo demo usa **password = username**.  
> Para admin, ingresa el email completo (`admin@disco.com`) y la contraseña real.

---

## 🔄 Flujo de pedido

```
pending  →  preparing  →  delivered
(Nuevo)     (Bartender     (Entregado
             lo acepta)     al mesero)
```

El bartender avanza el estado desde su Kanban.  
El mesero ve el estado con **pull-to-refresh** en la pestaña Historial.

---

## 🛠️ Personalización

### Agregar usuarios a la lista rápida
`MeseroLogin.tsx` y `BartenderLogin.tsx` tienen un array `QUICK_USERS`:
```ts
const QUICK_USERS: QuickUser[] = [
  { name: 'Nuevo', username: 'nuevo', color: '#10B981' },
];
```

### Cambiar intervalo de auto-refresh (bartender)
`BartenderHome.tsx`:
```ts
const POLL_MS = 8_000; // milisegundos
```

### Cambiar colores
`src/theme.ts` — sección `colors`.
