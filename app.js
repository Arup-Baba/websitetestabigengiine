import * as api from './api.js';
import * as state from './state.js';
import { updateCarView, goBackCar, handleCarSelectionConfirm, handleCarSelectionChange } from './components/modals/carSelectorModal.js';
import { openAuthModal, handleAuthContinue, handleVerifyOtp, handleResendOtp, initializeOtpService } from './components/modals/authModal.js';
import { openProfileModal, handleProfileFormSubmit, updateProfileUI, showProfileView } from './components/modals/profileModal.js';
import { openBookingModal } from './components/modals/bookingModal.js';
import { openReviewModal } from './components/modals/reviewModal.js';
import { openOrderDetailModal } from './components/modals/orderDetailModal.js';
import { addToCart, renderOrderPage } from './pages/cart.js';
import { renderTyreReplacementPage, clearTyrePageIntervals, startTyrePageIntervals } from './pages/tyreReplacement.js';
import { renderHomePage, clearHomePageIntervals, startHomePageIntervals } from './pages/home.js';
import { renderAboutUsPage } from './pages/about.js';
import { renderCarWashPage } from './pages/carWash.js';
import { renderCarCarePage } from './pages/carCare.js';
import { renderBatteryReplacementPage } from './pages/batteryReplacement.js';
import { showServiceDetailPage } from './pages/serviceDetail.js';
import { renderMyOrdersListPage } from './pages/myOrders.js';
import { renderOrderDetailsPage, renderPaymentMethodPage, renderOrderConfirmationPage } from './pages/checkout.js';
import { showNotification } from './lib/utils.js';

// --- Router logic ---

const hideAllPages = () => {
    const allContentIds = ['home-content', 'about-us-content', 'car-wash-content', 'battery-replacement-content', 'tyre-replacement-content', 'car-care-content', 'service-detail-page-content', 'my-order-content', 'my-orders-list-content', 'order-details-content', 'payment-method-content', 'order-confirmation-content'];
    allContentIds.forEach(id => document.getElementById(id)?.classList.add('hidden'));
    document.getElementById('nav-back-btn')?.classList.add('hidden');
};

const clearAllPageIntervals = () => {
    clearHomePageIntervals();
    clearTyrePageIntervals();
};

const showPage = (pageName, serviceId, serviceSlug) => {
    hideAllPages();
    clearAllPageIntervals();

    const checkoutPages = ['my-order', 'order-details', 'payment-method', 'order-confirmation'];
    if (!state.isLoggedIn && !checkoutPages.includes(pageName)) {
        state.setUserDetails(null);
    }
    
    const servicePages = ['car-wash', 'battery-replacement', 'tyre-replacement', 'car-care'];
    const isHomePage = pageName === 'home';
    const isAboutPage = pageName === 'about-us';
    const isServicePage = servicePages.includes(pageName) || pageName === 'service-detail';

    document.querySelectorAll('#nav-home, #footer-nav-home, #mobile-nav-home').forEach(el => el.classList.toggle('active', isHomePage));
    document.querySelectorAll('#nav-about, #footer-nav-about').forEach(el => el.classList.toggle('active', isAboutPage));
    document.querySelectorAll('#nav-services, #footer-nav-services, #mobile-nav-services').forEach(el => el.classList.toggle('active', isServicePage));

    const backBtn = document.getElementById('nav-back-btn');
    if (backBtn) {
        backBtn.classList.toggle('hidden', isHomePage);
    }
    
    let activeContent = null;
    switch (pageName) {
        case 'home':
            activeContent = document.getElementById('home-content');
            renderHomePage();
            startHomePageIntervals();
            break;
        case 'about-us':
            activeContent = document.getElementById('about-us-content');
            renderAboutUsPage();
            break;
        case 'car-wash':
            activeContent = document.getElementById('car-wash-content');
            renderCarWashPage();
            break;
        case 'battery-replacement':
            activeContent = document.getElementById('battery-replacement-content');
            renderBatteryReplacementPage();
            break;
        case 'tyre-replacement':
            activeContent = document.getElementById('tyre-replacement-content');
            renderTyreReplacementPage();
            startTyrePageIntervals();
            break;
        case 'car-care':
            activeContent = document.getElementById('car-care-content');
            renderCarCarePage();
            break;
        case 'service-detail':
             activeContent = document.getElementById('service-detail-page-content');
             showServiceDetailPage(serviceId, serviceSlug);
             break;
        case 'my-order':
            activeContent = document.getElementById('my-order-content');
            renderOrderPage();
            break;
        case 'my-orders-list':
             if (!state.isLoggedIn) {
                openAuthModal();
                return;
            }
            activeContent = document.getElementById('my-orders-list-content');
            renderMyOrdersListPage();
            break;
        case 'order-details':
            activeContent = document.getElementById('order-details-content');
            renderOrderDetailsPage();
            break;
        case 'payment-method':
            activeContent = document.getElementById('payment-method-content');
            renderPaymentMethodPage();
            break;
        case 'order-confirmation':
            activeContent = document.getElementById('order-confirmation-content');
            renderOrderConfirmationPage();
            break;
        default:
             activeContent = document.getElementById('home-content');
             renderHomePage();
             startHomePageIntervals();
             break;
    }

    if (activeContent) {
        activeContent.classList.remove('hidden');
        window.scrollTo(0, 0);
    }
    
    document.querySelectorAll('#mobile-bottom-nav .nav-item').forEach(el => el.classList.remove('active'));
    const isOrderPage = pageName === 'my-orders-list' || pageName === 'my-order';
    document.getElementById('mobile-nav-home')?.classList.toggle('active', isHomePage);
    document.getElementById('mobile-nav-services')?.classList.toggle('active', isServicePage);
    document.getElementById('mobile-nav-orders')?.classList.toggle('active', isOrderPage);

    updateProfileUI();
};

function handleNavigation() {
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);

    if (path === '/' || path === '/home' || segments[0] === 'home') {
        showPage('home');
    } else if (segments[0] === 'about-us') {
        showPage('about-us');
    } else if (segments[0] === 'my-order') {
        showPage('my-order');
    } else if (segments[0] === 'my-orders-list') {
        showPage('my-orders-list');
    } else if (segments[0] === 'order-details') {
        showPage('order-details');
    } else if (segments[0] === 'payment-method') {
        showPage('payment-method');
    } else if (segments[0] === 'order-confirmation') {
        showPage('order-confirmation');
    } else if (segments[0] === 'services') {
        if (segments.length === 1) {
            navigate('/services/car-wash'); 
        } else if (segments.length === 2) {
            showPage(segments[1]);
        } else if (segments.length === 3) {
            showPage('service-detail', segments[1], segments[2]);
        } else {
            showPage('home');
        }
    } else {
        showPage('home');
    }
}

function navigate(path) {
    if (window.location.pathname !== path) {
        window.history.pushState({}, '', path);
    }
    handleNavigation();
};

// --- App logic ---

async function initApp() {
    const loadingScreen = document.getElementById('initial-loading-screen');
    try {
        const [homepageResult, coreResult] = await Promise.allSettled([
            api.fetchHomepageData(),
            api.fetchCoreData()
        ]);

        if (homepageResult.status === 'fulfilled') {
            state.setReels(homepageResult.value.reels);
            state.setTestimonials(homepageResult.value.testimonials);
            state.setBanners(homepageResult.value.banners);
        } else {
            console.error("Failed to load homepage data:", homepageResult.reason);
        }

        if (coreResult.status === 'fulfilled') {
            state.setServices(coreResult.value.services);
            state.setCarDatabase(coreResult.value.carData);
        } else {
            console.error("Failed to load core data:", coreResult.reason);
            throw new Error("Could not load essential app data. Please check backend configuration.");
        }
        
        const savedSession = localStorage.getItem('loggedInUserSession');
        if (savedSession) {
            try {
                const { profile, orders } = JSON.parse(savedSession);
                state.setSessionData(profile, orders);
            } catch (e) {
                console.error("Failed to parse saved session:", e);
                localStorage.removeItem('loggedInUserSession');
            }
        }
        
        const guestCar = localStorage.getItem('guestSelectedCar');
        if (guestCar && !state.isLoggedIn) {
             try {
                state.setGuestSelectedCar(JSON.parse(guestCar));
            } catch (e) {
                console.error("Failed to parse guest car session:", e);
                localStorage.removeItem('guestSelectedCar');
            }
        }

        handleNavigation();
        
        api.fetchReviews().then(reviews => {
            state.setReviews(reviews);
            handleNavigation();
        });

        initializeOtpService().catch(err => {
            console.error(err);
        });
        
    } catch (error) {
        console.error('Application initialization failed:', error);
        if (loadingScreen) {
             const logo = loadingScreen.querySelector('.loading-logo');
             const spinner = loadingScreen.querySelector('.loading-spinner');
             const text = loadingScreen.querySelector('.loading-text');
             if (logo) logo.style.filter = 'grayscale(1)';
             if (spinner) spinner.style.borderColor = 'var(--error-color)';
             if (text) text.textContent = 'Failed to load app data. Please refresh.';
        }
        return;
    }

    loadingScreen?.classList.add('hidden');
    
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('change', handleGlobalChange);
    document.getElementById('user-details-form')?.addEventListener('submit', handleProfileFormSubmit);

    const reloadHomepage = () => {
        if (window.location.pathname === '/' || window.location.pathname === '/home') {
            window.location.reload();
        } else {
            window.location.href = '/home';
        }
    };
    document.getElementById('nav-logo')?.addEventListener('click', reloadHomepage);
    document.getElementById('footer-logo')?.addEventListener('click', reloadHomepage);

    window.addEventListener('popstate', handleNavigation);
}

async function handleGlobalClick(e) {
    const target = e.target;

    const navLink = target.closest('a[href^="/"]');
    if (navLink && !navLink.getAttribute('target')) {
        e.preventDefault();
        navigate(navLink.getAttribute('href'));
        return;
    }

    if (target.closest('#car-selector-trigger') || target.closest('#select-car-prompt-btn') || target.closest('#change-vehicle-btn')) {
        state.resetSelectionState();
        updateCarView();
        document.getElementById('car-selection-modal')?.classList.remove('hidden');
    }
    if (target.closest('#modal-close-btn')) {
        document.getElementById('car-selection-modal')?.classList.add('hidden');
    }
    if (target.closest('#modal-back-btn')) {
        goBackCar();
    }
    const carSelectionItem = target.closest('.grid-item, .list-item');
    if (carSelectionItem) {
        const id = carSelectionItem.dataset.id;
        const newSelection = { ...state.selectionState };
        switch (state.selectionState.step) {
            case 'brand': newSelection.brand = id; newSelection.step = 'model'; break;
            case 'model': newSelection.model = id; newSelection.step = 'variant'; break;
            case 'variant': newSelection.variant = id; newSelection.step = 'confirmation'; break;
        }
        state.setSelectionState(newSelection);
        updateCarView();
    }
    if (target.closest('[data-action="confirm-car-selection"]')) {
        handleCarSelectionConfirm(e.target.closest('[data-action="confirm-car-selection"]'));
    }
    if (target.closest('[data-action="change-car-selection"]')) {
        handleCarSelectionChange();
    }

    const profileBtn = target.closest('#profile-action-btn') || target.closest('#mobile-profile-btn');
    if (profileBtn) {
        openProfileModal();
        return;
    }
    if (target.closest('#auth-modal-close-btn') || target.closest('#auth-success-continue-btn')) {
        document.getElementById('auth-modal')?.classList.add('hidden');
    }
    if (target.closest('#auth-continue-btn')) {
        handleAuthContinue(e);
    }
    if (target.closest('#auth-verify-btn')) {
        handleVerifyOtp(e);
    }
    if (target.closest('#auth-resend-otp-btn')) {
        handleResendOtp();
    }
    if (target.closest('#profile-modal-close-btn')) {
        document.getElementById('profile-page-modal')?.classList.add('hidden');
    }
    if(target.closest('#profile-edit-btn')) {
        showProfileView('edit');
    }
    if(target.closest('.profile-menu-item[data-action="orders"]')) {
        document.getElementById('profile-page-modal')?.classList.add('hidden');
        navigate('/my-orders-list');
    }
    if(target.closest('.profile-menu-item[data-action="vehicle"]')) {
        document.getElementById('profile-page-modal')?.classList.add('hidden');
        state.resetSelectionState();
        updateCarView();
        document.getElementById('car-selection-modal')?.classList.remove('hidden');
    }
    if(target.closest('#profile-dashboard-logout-btn')) {
        state.setLoggedIn(false, null);
        document.getElementById('profile-page-modal')?.classList.add('hidden');
        showNotification("You have been logged out.", "success");
        navigate('/home');
    }

    const addToCartBtn = target.closest('.add-to-cart-btn');
    if (addToCartBtn) {
        const serviceId = addToCartBtn.dataset.id;
        const service = state.services.find(s => s.id === serviceId);
        if (service?.segment?.trim().toLowerCase() === "car wash") {
            openBookingModal(serviceId, false);
        } else {
            addToCart(serviceId);
        }
    }
    const buyNowBtn = target.closest('.buy-now-btn');
    if (buyNowBtn) {
        const serviceId = buyNowBtn.dataset.id;
        const service = state.services.find(s => s.id === serviceId);
        if (service?.segment?.trim().toLowerCase() === "car wash") {
            openBookingModal(serviceId, true);
        } else {
            if (addToCart(serviceId)) {
                navigate('/my-order');
            }
        }
    }
    if (target.closest('#cart-icon-container')) {
        navigate('/my-order');
    }

    if (target.closest('.view-order-details-btn')) {
        openOrderDetailModal(target.closest('.view-order-details-btn').dataset.orderId);
    }
    if (target.closest('#order-summary-modal-close-btn')) {
        document.getElementById('order-details-summary-modal')?.classList.add('hidden');
    }
    if (target.closest('.review-order-item-btn')) {
        openReviewModal(target.closest('.review-order-item-btn').dataset.serviceId);
    }
    if (target.closest('#review-modal-close-btn')) {
        document.getElementById('review-modal')?.classList.add('hidden');
    }
    if (target.closest('#nav-back-btn')) {
        window.history.back();
    }

    if (target.closest('#tyre-filter-reset-btn')) {
        state.setPageForCategory('tyre-replacement', 1);
        state.resetTyreFilters();
        renderTyreReplacementPage();
    }
}

function handleGlobalChange(e) {
    const target = e.target;
    
    if (target.closest('#tyre-filter-bar select')) {
        const select = target.closest('#tyre-filter-bar select');
        const filterKey = select.dataset.filter;
        const value = select.value;
        const newFilters = { ...state.tyreFilters, [filterKey]: value };
        state.setPageForCategory('tyre-replacement', 1);
        state.setTyreFilters(newFilters);
        renderTyreReplacementPage();
    }
}

// --- Application Entry Point ---
document.addEventListener('DOMContentLoaded', initApp);