<template>
  ...
  <!-- Existing content -->
  <a href="...">Kirim masukan</a>  
  <button
      type="button"
      class="action-btn"
      @click="shareApp"
  >
      📤 Bagikan Aplikasi
  </button>
  ...
</template>

<script>
  ...
  // Existing functions

  async function shareApp(): Promise<void> {
      if (!navigator.share) {
          alert('Share is not supported on this device');
          return;
      }
      try {
          await navigator.share({
              title: 'Quran Tikrar',
              text: 'Aplikasi untuk menghafal Quran dengan metode Tikrar',
              url: window.location.href,
          });
      } catch (err) {
          // User cancelled the share dialog
      }
  }
  ...
</script>