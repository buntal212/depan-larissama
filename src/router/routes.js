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
      { path: 'pengguna', redirect: '/pengaturan/pengguna', meta: { roles: ['owner', 'superadmin'] } },
      { path: 'warung', redirect: '/pengaturan/profil', meta: { roles: ['owner', 'manager', 'kasir'] } },
      { path: 'paket-langganan', component: () => import('@/pages/Langganan/SubscriptionPlansPage.vue'), meta: { roles: ['owner'] } },
      {
        path: 'pengaturan',
        component: () => import('@/pages/Pengaturan/SettingsPage.vue'),
        meta: { roles: ['owner', 'manager', 'kasir', 'superadmin'] },
        children: [
          { path: 'profil', component: () => import('@/pages/ProfilWarung/WarungProfilePage.vue'), meta: { roles: ['owner', 'manager', 'kasir'] } },
          { path: 'pengguna', component: () => import('@/pages/Pengguna/UsersPage.vue'), meta: { roles: ['owner', 'superadmin'] } },
          { path: 'printer', component: () => import('@/pages/Pengaturan/PrinterSettingsPage.vue'), meta: { roles: ['owner', 'manager', 'kasir', 'superadmin'] } },
        ],
      },
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
