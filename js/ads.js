// Banner ads (Google AdSense). No rewarded ads — gameplay is never gated or boosted by ads.
(function () {
  const ADS = {
    enabled: true,
    // Set these after AdSense approves your site:
    clientId: '', // e.g. ca-pub-XXXXXXXXXXXXXXXX
    bannerSlot: '', // display ad unit slot ID
  };

  const slot = document.getElementById('ad-slot');
  if (!slot) return;

  function isLocalDev() {
    const host = location.hostname;
    return !host || host === 'localhost' || host === '127.0.0.1' || location.protocol === 'file:';
  }

  function showDevPlaceholder() {
    slot.innerHTML =
      '<p class="ad-placeholder muted">Ad banner · add your AdSense IDs in js/ads.js</p>';
  }

  function loadBanner() {
    if (!ADS.enabled || !ADS.clientId || !ADS.bannerSlot) {
      if (isLocalDev()) showDevPlaceholder();
      return;
    }

    if (!document.querySelector('script[data-adsense-loader]')) {
      const loader = document.createElement('script');
      loader.async = true;
      loader.src =
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
        encodeURIComponent(ADS.clientId);
      loader.crossOrigin = 'anonymous';
      loader.setAttribute('data-adsense-loader', '1');
      document.head.appendChild(loader);
    }

    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', ADS.clientId);
    ins.setAttribute('data-ad-slot', ADS.bannerSlot);
    ins.setAttribute('data-ad-format', 'horizontal');
    ins.setAttribute('data-full-width-responsive', 'true');
    slot.appendChild(ins);

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn('adsbygoogle init failed:', err);
    }
  }

  if (isLocalDev() && (!ADS.clientId || !ADS.bannerSlot)) {
    showDevPlaceholder();
  } else {
    loadBanner();
  }
})();
