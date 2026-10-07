<template>
  <q-page class="page-shell">
    <div class="page-heading">
      <div class="eyebrow">PENGATURAN WARUNG</div>
      <h1 class="page-title">Profil Warung</h1>
      <p class="page-subtitle">Informasi warung yang terhubung ke akun demo ini.</p>
    </div>
    <q-card flat bordered class="panel-card profile-card">
      <q-card-section class="row items-center q-gutter-md">
        <q-avatar size="68px" class="profile-store-avatar"
          ><q-icon name="storefront" size="34px"
        /></q-avatar>
        <div>
          <div class="panel-title">Warung Bu Ani</div>
          <div class="panel-caption">Profil contoh · belum terhubung ke backend</div>
        </div>
      </q-card-section>
      <q-separator />
      <q-list separator>
        <q-item
          ><q-item-section
            ><q-item-label caption>Kode warung</q-item-label
            ><q-item-label>WARUNG-BU-ANI</q-item-label></q-item-section
          ></q-item
        >
        <q-item
          ><q-item-section
            ><q-item-label caption>Alamat</q-item-label
            ><q-item-label>Data contoh belum diatur</q-item-label></q-item-section
          ></q-item
        >
        <q-item
          ><q-item-section
            ><q-item-label caption>Telepon</q-item-label
            ><q-item-label>—</q-item-label></q-item-section
          ></q-item
        >
        <q-item
          ><q-item-section
            ><q-item-label caption>Status</q-item-label
            ><q-item-label
              ><q-badge color="positive">Aktif (demo)</q-badge></q-item-label
            ></q-item-section
          ></q-item
        >
      </q-list>
      <q-card-section
        ><q-banner rounded class="bg-orange-1 text-grey-9"
          >Untuk sementara profil hanya tampilan contoh. API saat ini belum menyediakan endpoint
          edit profil warung sendiri atau upload logo.</q-banner
        ></q-card-section
      >
    </q-card>
  </q-page>
</template>

<style scoped>
.profile-card {
  max-width: 760px;
}
.profile-store-avatar {
  background: #e9f5ed;
  color: #176342;
}
</style>
