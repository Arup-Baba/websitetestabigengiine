
import * as state from './state.js';
import { showLoadingOverlay } from './dom-helpers.js';
import { showNotification } from './ui.js';

// --- Backend Data Synchronization ---

const postToBackend = async (backendUrl, action, payload, loadingMessage) => {
    if (!backendUrl) {
        alert(`Cannot perform action '${action}'. The required backend URL is not configured.`);
        return { success: false, data: null };
    }

    if (loadingMessage) showLoadingOverlay(true, loadingMessage);
    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, payload }),
            mode: 'cors',
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }
        const result = await response.json();
        // Allow notFound as a "successful" response from the backend that the frontend needs to handle.
        if (result.status !== 'success' && result.status !== 'notFound') {
            throw new Error(result.message || 'An unknown error occurred on the backend.');
        }
        return { success: true, data: result };
    } catch (error) {
        console.error(`Error posting data for action '${action}':`, error);
        alert(`Failed to save data: ${error instanceof Error ? error.message : String(error)}`);
        return { success: false, data: null };
    } finally {
        if (loadingMessage) showLoadingOverlay(false);
    }
};

/**
 * Fetches only the data required for the homepage (reels, testimonials, banners).
 */
export const fetchHomepageData = async () => {
    if (!state.backendUrl) throw new Error('Main Backend URL not configured.');
    const url = new URL(state.backendUrl);
    url.searchParams.append('action', 'getHomepageData');
    const response = await fetch(url.toString(), { method: 'GET', mode: 'cors' });
    if (!response.ok) throw new Error(`Server responded with ${response.status}`);
    const data = await response.json();
    if (data.status !== 'success') throw new Error(data.message);
    return {
        reels: data.reels || [],
        testimonials: data.testimonials || [],
        banners: data.banners || []
    };
};

/**
 * Fetches the core data required for the app to be interactive (services, car database).
 */
export const fetchCoreData = async () => {
    if (!state.backendUrl) throw new Error('Main Backend URL not configured.');
    const url = new URL(state.backendUrl);
    url.searchParams.append('action', 'getCoreData');
    const response = await fetch(url.toString(), { method: 'GET', mode: 'cors' });
    if (!response.ok) throw new Error(`Server responded with ${response.status}`);
    const data = await response.json();
    if (data.status !== 'success') throw new Error(data.message);
    return {
        services: data.services || [],
        carData: data.carData || null
    };
};

/**
 * Fetches non-critical review data in the background.
 */
export const fetchReviews = async () => {
    if (!state.userDataBackendUrl) {
        console.warn('User Data Backend URL not configured. Cannot fetch reviews.');
        return [];
    }
    try {
        const url = new URL(state.userDataBackendUrl);
        url.searchParams.append('action', 'getReviews');
        const response = await fetch(url.toString(), { method: 'GET', mode: 'cors' });
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message);
        return data.reviews || [];
    } catch (e) {
        console.error("Failed to fetch reviews in background:", e);
        return []; // Don't block the app for this non-critical fetch
    }
};


/**
 * A utility function to fetch ALL data in parallel, used for refreshing the app state
 * after a major action like submitting a review.
 * @param {boolean} showOverlay - Whether to show the full-screen loading overlay.
 */
export const fetchAllData = async (showOverlay = true) => {
    if (showOverlay) showLoadingOverlay(true, 'Refreshing all data...');
    try {
        // Run all fetches in parallel for a full refresh
        const [homepageData, coreData, reviewsData] = await Promise.all([
            fetchHomepageData(),
            fetchCoreData(),
            fetchReviews()
        ]);
        
        // Repopulate the state
        state.setReels(homepageData.reels);
        state.setTestimonials(homepageData.testimonials);
        state.setBanners(homepageData.banners);
        state.setServices(coreData.services);
        state.setCarDatabase(coreData.carData);
        state.setReviews(reviewsData);

    } catch (error) {
        console.error('Failed to refresh all data:', error);
        throw error; // Let the caller handle the error display
    } finally {
        if (showOverlay) showLoadingOverlay(false);
    }
};


/**
 * Fetches profile and order data for a specific user from the user data backend.
 * @param mobile The user's mobile number.
 * @returns An object with the user's profile and orders, or null if not found.
 */
export const fetchUserData = async (mobile) => {
    if (!state.userDataBackendUrl) {
        throw new Error('User Data Backend URL is not configured.');
    }
    
    showLoadingOverlay(true, 'Fetching your data...');
    try {
        const url = new URL(state.userDataBackendUrl);
        url.searchParams.append('action', 'getUserData');
        url.searchParams.append('mobile', mobile);

        const response = await fetch(url.toString(), { method: 'GET', mode: 'cors' });
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        const result = await response.json();
        
        if (result.status === 'notFound') {
            return null; // User does not exist yet
        }
        if (result.status !== 'success') {
            throw new Error(result.message || 'Failed to get user data.');
        }

        return {
            profile: result.profile,
            orders: result.orders || [],
        };
    } catch (error) {
        console.error('Error fetching user data:', error);
        throw error; // Re-throw for the caller to handle
    } finally {
        showLoadingOverlay(false);
    }
};

/**
 * Fetches just the car database from the main backend.
 * @returns {Promise<boolean>} True on success, throws error on failure.
 */
export const fetchCarDatabase = async () => {
    if (!state.backendUrl) {
        throw new Error('Main Backend URL is not configured in the Admin Panel.');
    }
    
    try {
        const url = new URL(state.backendUrl);
        url.searchParams.append('action', 'getCarData');

        const response = await fetch(url.toString(), {
            method: 'GET',
            mode: 'cors',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }
        const result = await response.json();

        if (result.status !== 'success') {
            throw new Error(result.message || 'An unknown error occurred on the backend.');
        }

        state.setCarDatabase(result.carData || null);
        return true;
    } catch (error) {
        console.error(`Error fetching car database:`, error);
        // Re-throw so the UI handler can display the error.
        throw error;
    }
};

export const saveNewOrder = async (order) => {
    // This action should append a single order (sent in an array) on the backend.
    const orderWithTracking = {
        ...order,
        trackingHistory: [
            { status: 'Placed', timestamp: new Date().toISOString() }
        ]
    };
    const result = await postToBackend(state.userDataBackendUrl, 'saveOrders', [orderWithTracking], 'Saving your order...');
    return result.success ? orderWithTracking : null;
};

export const saveReview = async (review) => {
    if (!state.userDetails) {
        showNotification('You must be logged in to leave a review.', 'error');
        return false;
    }

    const payload = {
        ...review,
        userId: state.userDetails.mobile,
        userName: `${state.userDetails.firstName} ${state.userDetails.lastName}`.trim(),
    };

    const result = await postToBackend(state.userDataBackendUrl, 'saveReview', payload, 'Submitting your review...');
    return result.success;
};

export const saveCurrentUserProfile = async () => {
    if (!state.userDetails) return false;
    // This action now saves a single user's profile to the user data backend.
    const result = await postToBackend(state.userDataBackendUrl, 'saveUserData', state.userDetails, 'Saving profile...');
    return result.success;
};