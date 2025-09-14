
import * as state from './state.js';
import { renderHomePage, clearHomePageIntervals, startHomePageIntervals } from './pages/home.js';
import { renderAboutUsPage } from './pages/about.js';
import { renderCarWashPage } from './pages/carWash.js';
import { renderCarCarePage } from './pages/carCare.js';
import { renderBatteryReplacementPage } from './pages/batteryReplacement.js';
import { renderTyreReplacementPage, clearTyrePageIntervals, startTyrePageIntervals } from './pages/tyreReplacement.js';
import { showServiceDetailPage } from './pages/serviceDetail.js';
import { renderOrderPage } from './pages/cart.js';
import { renderMyOrdersListPage } from './pages/myOrders.js';
import { renderOrderDetailsPage, renderPaymentMethodPage, renderOrderConfirmationPage } from './pages/checkout.js';
import { openAuthModal } from './components/modals/authModal.js';
import { updateProfileUI } from './components/modals/profileModal.js';

const hideAllPages = () => {
    const allContentIds = ['home-content', 'about-us-content', 'car-wash-content', 'battery-replacement-content', 'tyre-replacement-content', 'car-care-content', 'service-detail-page-content', 'my-order-content', 'my-orders-list-content', 'order-details-content', 'payment-method-content', 'order-confirmation-content'];
    allContentIds.forEach(id => document.getElementById(id)?.classList.add('hidden'));
    document.getElementById('nav-back-btn')?.classList.add('hidden');
};

const clearAllPageIntervals = () => {
    clearHomePageIntervals();
    clearTyrePageIntervals();
};

export const showPage = (pageName, serviceId, serviceSlug) => {
    hideAllPages();
    clearAllPageIntervals();

    // Clear temporary guest user details when navigating away from the checkout flow
    const checkoutPages = ['my-order', 'order-details', 'payment-method', 'order-confirmation'];
    if (!state.isLoggedIn && !checkoutPages.includes(pageName)) {
        state.setUserDetails(null);
    }
    
    // Update nav links active state
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
    
    // Update mobile nav links active state
    document.querySelectorAll('#mobile-bottom-nav .nav-item').forEach(el => el.classList.remove('active'));
    const isOrderPage = pageName === 'my-orders-list' || pageName === 'my-order';
    document.getElementById('mobile-nav-home')?.classList.toggle('active', isHomePage);
    document.getElementById('mobile-nav-services')?.classList.toggle('active', isServicePage);
    document.getElementById('mobile-nav-orders')?.classList.toggle('active', isOrderPage);

    updateProfileUI();
};


export function handleNavigation() {
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
            showPage('home'); 
        } else if (segments.length === 2) {
            showPage(segments[1]);
        } else if (segments.length === 3) {
            showPage('service-detail', segments[1], segments[2]);
        } else {
            showPage('home');
        }
    } else {
        showPage('home'); // Fallback to home
    }
}


export function navigate(path) {
    if (window.location.pathname !== path) {
        window.history.pushState({}, '', path);
    }
    handleNavigation();
};
