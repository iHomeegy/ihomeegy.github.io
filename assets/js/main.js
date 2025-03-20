/* JS المحدث مع جميع التحسينات */
(function($) {

	const $window = $(window),
		$head = $('head'),
		$body = $('body'),
		perfEntries = performance.getEntriesByType("navigation");

	// قياس أداء التحميل
	if (perfEntries.length > 0) {
		console.log('TTFB:', perfEntries[0].responseStart - perfEntries[0].requestStart);
	}

	// تسجيل Service Worker
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
			navigator.serviceWorker.register('/sw.js')
			.then(registration => console.log('SW registered'))
			.catch(err => console.log('SW registration failed:', err));
		});
	}

	// تهيئة Web Worker
	const imageWorker = new Worker(URL.createObjectURL(new Blob([
		`self.onmessage = function(e) {
			// معالجة الصور هنا
			postMessage('done');
		}`
	])));

	// Breakpoints
	breakpoints({
		xlarge: ['1281px', '1680px'],
		large: ['981px', '1280px'],
		medium: ['737px', '980px'],
		small: ['481px', '736px'],
		xsmall: ['361px', '480px'],
		xxsmall: [null, '360px'],
		'xlarge-to-max': '(min-width: 1681px)',
		'small-to-xlarge': '(min-width: 481px) and (max-width: 1680px)'
	});

	// إدارة أحداث التحميل
	$window.on('load', function() {
		$body.css('opacity', 0);
		
		// تحميل مسبق للروابط
		$('a').hover(prefetchLinks);
		
		window.setTimeout(() => {
			$body.removeClass('is-preload')
				.css({'opacity': 1, 'transition': 'opacity 0.4s ease-in-out'});
				
			// تحميل الصور مع تأثير
			loadImagesWithEffect();
		}, 100);
	});

	// أحداث Resize
	let resizeTimeout;
	$window.on('resize', () => {
		$body.addClass('is-resizing');
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => $body.removeClass('is-resizing'), 100);
	});

	// إصلاح object-fit
	if (!browser.canUse('object-fit') || browser.name == 'safari') {
		$('.image.object').each(function() {
			const $this = $(this),
				$img = $this.children('img'),
				src = $img.attr('src');

			$img.css('opacity', '0')
				.on('error', () => handleImageError($img))
				.parent()
				.css({
					'background-image': `url("${src}")`,
					'background-size': $img.css('object-fit') || 'cover',
					'background-position': $img.css('object-position') || 'center'
				});
		});
	}

	// Sidebar Logic
	const $sidebar = $('#sidebar'),
		$sidebar_inner = $sidebar.children('.inner');

	// إدارة أحداث السايدبار
	const initSidebar = () => {
		// التمرير والتثبيت
		$window.on('scroll.sidebar-lock resize.sidebar-lock', function() {
			if (breakpoints.active('<=large')) return;

			const sh = $sidebar_inner.outerHeight() + 30,
				wh = $window.height(),
				st = $window.scrollTop(),
				x = Math.max(sh - wh, 0),
				y = Math.max(0, st - x);

			if ($sidebar_inner.data('locked') == 1) {
				y <= 0 ? unlockSidebar() : $sidebar_inner.css('transform', `translateY(${-x}px)`);
			} else if (y > 0) {
				lockSidebar(x);
			}
		}).trigger('resize.sidebar-lock');

		// أحداث التoggle
		$sidebar.find('.toggle').on('click', function(e) {
			e.preventDefault();
			$sidebar.toggleClass('inactive');
		});

		// إدارة الذاكرة
		const destroy = () => {
			$window.off('scroll.sidebar-lock resize.sidebar-lock');
			imageWorker.terminate();
		};
		
		$window.on('beforeunload', destroy);
	};

	// وظائف مساعدة
	const lockSidebar = (x) => {
		$sidebar_inner
			.data('locked', 1)
			.css({'position': 'fixed', 'transform': `translateY(${-x}px)`});
	};

	const unlockSidebar = () => {
		$sidebar_inner
			.data('locked', 0)
			.css({'position': '', 'transform': ''});
	};

	const loadImagesWithEffect = () => {
		$('img').each(function() {
			const $img = $(this);
			if ($img[0].complete) {
				$img.css('opacity', 1);
			} else {
				$img.css({'opacity': 0, 'background': '#f0f0f0 url(placeholder.svg) center no-repeat'})
					.on('load error', function() {
						$(this).css({'opacity': 1, 'background': ''});
					});
			}
		});
	};

	const prefetchLinks = function() {
		const href = $(this).attr('href');
		if (href) fetch(href, {mode: 'no-cors'});
	};

	const handleImageError = ($img) => {
		$img.css('opacity', 1)
			.attr('src', 'error-image.png')
			.off('error');
	};

	// تهيئة القائمة
	const initMenu = () => {
		const $menu = $('#menu'),
			$menu_openers = $menu.find('.opener');

		$menu_openers.on('click', function(e) {
			e.preventDefault();
			$menu_openers.not(this).removeClass('active');
			$(this).toggleClass('active');
			$window.triggerHandler('resize.sidebar-lock');
		});
	};

	// الانتقال بين الصفحات
	$(document).on('click', 'a[href]:not([target="_blank"])', function(e) {
		const href = $(this).attr('href');
		if (href.match(/^(#|mailto:|tel:|javascript:)/)) return;

		e.preventDefault();
		$body.css('opacity', 0);
		setTimeout(() => window.location.href = href, 400);
	});

	// تهيئة Structured Data للـ SEO
	if (window.location.pathname === '/') {
		$head.append(`<script type="application/ld+json">
			{
				"@context": "https://schema.org",
				"@type": "WebSite",
				"name": "اسم الموقع",
				"url": "${window.location.origin}"
			}
		</script>`);
	}

	// إعدادات الأمان
	const csp = `default-src 'self' https:; style-src 'self' 'unsafe-inline';`;
	$head.append(`<meta http-equiv="Content-Security-Policy" content="${csp}">`);

	// التشغيل الأولي
	initSidebar();
	initMenu();

})(jQuery);
