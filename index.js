
import * as api from './api.js';
import * as state from './state.js';
import { handleNavigation, navigate } from './router.js';
import { updateCarView, goBackCar, handleCarSelectionConfirm, handleCarSelectionChange } from './components/modals/carSelectorModal.js';
import { openAuthModal, handleAuthContinue, handleVerifyOtp, handleResendOtp, initializeOtpService } from './components/modals/authModal.js';
import { openProfileModal, handleProfileFormSubmit, showProfileView } from './components/modals/profileModal.js';
import { openBookingModal } from './components/modals/bookingModal.js';
import { openReviewModal } from './components/modals/reviewModal.js';
import { openOrderDetailModal } from './components/modals/orderDetailModal.js';
import { addToCart } from './pages/cart.js';
import { renderTyreReplacementPage } from './pages/tyreReplacement.js';

/**
 * Main application initialization function.
 */
async function initApp() {
    const loadingScreen = document.getElementById('initial-loading-screen');
    try {
        // Parallel fetching for faster initial load
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
        
        // Attempt to restore session
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
        
        // Non-critical fetches
        api.fetchReviews().then(reviews => {
            state.setReviews(reviews);
             // Re-render current page if it depends on reviews
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
        return; // Stop execution
    }

    loadingScreen?.classList.add('hidden');
    
    // --- Global Event Listeners ---
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('change', handleGlobalChange);
    document.getElementById('user-details-form')?.addEventListener('submit', handleProfileFormSubmit);

    // --- Logo Click Listeners for Homepage Refresh ---
    const reloadHomepage = () => {
        if (window.location.pathname === '/' || window.location.pathname === '/home') {
            window.location.reload();
        } else {
            window.location.href = '/home';
        }
    };
    document.getElementById('nav-logo')?.addEventListener('click', reloadHomepage);
    document.getElementById('footer-logo')?.addEventListener('click', reloadHomepage);

    // Handle browser back/forward buttons
    window.addEventListener('popstate', handleNavigation);
}

/**
 * Handles all delegated click events for the application.
 */
async function handleGlobalClick(e) {
    const target = e.target;

    // --- Navigation ---
    const navLink = target.closest('a[href^="/"]');
    if (navLink && !navLink.getAttribute('target')) {
        e.preventDefault();
        navigate(navLink.getAttribute('href'));
        return;
    }

    // --- Car Selector ---
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

    // --- Auth & Profile ---
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
    if(target.closest('#profile-dashboard-logout-btn')) {
        state.setLoggedIn(false, null);
        document.getElementById('profile-page-modal')?.classList.add('hidden');
        showNotification("You have been logged out.", "success");
        navigate('/home');
    }

    // --- Cart & Services ---
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

    // --- Modals ---
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

    // --- Tyre Filters ---
    if (target.closest('#tyre-filter-reset-btn')) {
        state.setPageForCategory('tyre-replacement', 1);
        state.resetTyreFilters();
        renderTyreReplacementPage();
    }
}

/**
 * Handles all delegated change events for the application.
 */
function handleGlobalChange(e) {
    const target = e.target;
    
    // --- Tyre Replacement Filters ---
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
