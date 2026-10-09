const routes = [
  { path: '/login', component: () => import('@/pages/Auth/LoginPage.vue'), meta: { guestOnly: true } },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', component: () => import('@/pages/Dashboard/IndexPage.vue') },
      { path: 'menu', component: () => import('@/pages/MenuKategori/MenuPage.vue'), meta: { roles: ['owner', 'manager', 'kasir', 'superadmin'] } },
      { path: 'transaksi', component: () => import('@/pages/Kasir/TransactionPage.vue'), meta: { roles: ['owner', 'manager', 'kasir', 'superadmin'] } },
      { path: 'penjualan', component: () => import('@/pages/Penjualan/SalesPage.vue'), meta: { roles: ['owner', 'manager', 'kasir', 'superadmin'] } },
      { path: 'pembelian', component: () => import('@/pages/Pembelian/PurchasesPage.vue'), meta: { roles: ['owner', 'manager', 'superadmin'] } },
      { path: 'laporan', component: () => import('@/pages/Laporan/ReportsPage.vue'), meta: { roles: ['owner', 'manager', 'superadmin'] } },
      { path: 'pengguna', component: () => import('@/pages/Pengguna/UsersPage.vue'), meta: { roles: ['owner', 'superadmin'] } },
      { path: 'warung', component: () => import('@/pages/ProfilWarung/WarungPage.vue'), meta: { roles: ['owner', 'manager', 'kasir'] } },
      { path: 'platform/warungs', component: () => import('@/pages/Platform/WarungsPage.vue'), meta: { roles: ['superadmin'] } },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
]

export default routes
