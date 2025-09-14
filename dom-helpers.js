export const setAsyncImage = (element, url) => {
    const parent = element.parentElement;

    const resetParentState = () => {
        if(parent) {
            parent.classList.remove('error', 'no-image', 'loading');
        }
    }

    if (!url || typeof url !== 'string' || url.includes('.mp4')) {
        resetParentState();
        if (parent) parent.classList.add('no-image');
         if(typeof url === 'string' && url.includes('.mp4')) {
            console.error(`Attempted to load video URL in img tag: ${url}`);
         }
        return;
    }

    // Simplified logic for direct URLs (Cloudflare R2, etc.)
    resetParentState();
    if (parent) parent.classList.add('loading');
    
    element.onload = () => {
        if(parent) parent.classList.remove('loading');
    };
    element.onerror = () => {
        if (parent) {
            parent.classList.remove('loading');
            parent.classList.add('error');
        }
        console.error(`Failed to load direct image URL: ${url}`);
    };
    
    element.src = url;
};

export const showLoadingOverlay = (show, text = 'Loading...') => {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    const textSpan = overlay.querySelector('span');
    if (textSpan) textSpan.textContent = text;
    overlay.style.display = show ? 'flex' : 'none';
};

/**
 * Parses a standard tyre title string into a structured object.
 * Robustly handles multi-word model names.
 * @param title The tyre title string (e.g., "CEAT SecuraDrive 185/65 R15 88T")
 * @returns A TyreDetails object or null if parsing fails.
 */
export const parseTyreTitle = (title) => {
    const specRegex = /(?<width>\d+)\/(?<profile>\d+)\s*R(?<radius>\d+)\s+(?<loadIndex>\d+)(?<speedRating>[A-Za-z])$/;
    const specMatch = title.match(specRegex);

    if (specMatch && specMatch.groups && typeof specMatch.index === 'number') {
        const brandAndModelStr = title.substring(0, specMatch.index).trim();
        const brandModelParts = brandAndModelStr.split(/\s+/);
        
        if (brandModelParts.length < 2) return null; // Must have at least a brand and a model part

        const brand = brandModelParts[0];
        const model = brandModelParts.slice(1).join(' ');

        return {
            brand: brand,
            model: model,
            width: specMatch.groups.width,
            profile: specMatch.groups.profile,
            radius: specMatch.groups.radius,
            loadIndex: specMatch.groups.loadIndex,
            speedRating: specMatch.groups.speedRating.toUpperCase(),
        };
    }
    return null;
};

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 * @param func The function to debounce.
 * @param waitFor The number of milliseconds to delay.
 * @returns The new debounced function.
 */
export function debounce(func, waitFor) {
    let timeout = null;

    return (...args) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => func(...args), waitFor);
    };
}

/**
 * Converts a string into a URL-friendly slug.
 * @param {string} text The string to convert.
 * @returns {string} The slugified string.
 */
export const slugify = (text) => {
    if (typeof text !== 'string') return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w-]+/g, '') // Remove all non-word chars
        .replace(/--+/g, '-'); // Replace multiple - with single -
};

/**
 * Manages the loading state of a button, showing a spinner and disabling it.
 * @param {HTMLButtonElement} button The button element to manage.
 * @param {boolean} isLoading True to show spinner, false to restore.
 */
export const setButtonLoadingState = (button, isLoading) => {
    if (!button) return;

    if (isLoading) {
        if (!button.dataset.originalContent) {
            button.dataset.originalContent = button.innerHTML;
        }
        button.disabled = true;
        button.classList.add('loading');
        button.innerHTML = '<span class="spinner"></span>';
    } else {
        if (button.dataset.originalContent) {
            button.innerHTML = button.dataset.originalContent;
            delete button.dataset.originalContent;
        }
        button.disabled = false;
        button.classList.remove('loading');
    }
};