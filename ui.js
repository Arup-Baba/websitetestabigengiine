

import * as state from './state.js';
import * as api from './api.js';
import { setAsyncImage, parseTyreTitle, slugify, setButtonLoadingState } from './dom-helpers.js';

// --- Banner Carousel State ---
const bannerIntervals = new Map();
const BANNER_INTERVAL_DURATION = 3000; // 3 seconds

// --- Notification System ---
/**
 * Displays a non-blocking notification message.
 * @param message The text to display.
 * @param type The type of notification ('success', 'error', 'info').
 * @param duration The time in milliseconds to show the notification.
 */
export const showNotification = (message, type = 'info', duration = 3000) => {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';

    notification.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`;
    
    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, duration);
};

export const addToCart = (serviceId, bookingDetails = null) => {
    const service = state.services.find(s => s.id === serviceId);
    if (!service) {
        showNotification('Could not find service details.', 'error');
        return false;
    }

    const price = parseFloat(String(service.price).replace(/[^\d.]/g, ''));
    if (isNaN(price)) {
        showNotification('Service price is invalid.', 'error');
        return false;
    }

    const newCart = [...state.cart];
    let itemIndex = -1;

    if (bookingDetails) {
        itemIndex = newCart.findIndex(item => 
            item.id === serviceId && 
            item.bookingDate === bookingDetails.date && 
            item.bookingTime === bookingDetails.time
        );
    } else {
        itemIndex = newCart.findIndex(item => item.id === serviceId && !item.bookingDate);
    }

    if (itemIndex > -1) {
        if (bookingDetails) {
            showNotification('This service and slot is already in your cart.', 'info');
            return false;
        } else {
            newCart[itemIndex].quantity += 1;
        }
    } else {
        const primaryMediaUrl = (service.galleryUrls?.[0]) || (Array.isArray(service.imageUrls) ? service.imageUrls[0] : service.imageUrls) || service.videoSrc;
        const newItem = {
            id: service.id,
            name: service.title,
            price: price,
            thumbnailSrc: primaryMediaUrl || '',
            itemType: (primaryMediaUrl && primaryMediaUrl.toLowerCase().includes('.mp4')) ? 'video' : 'image',
            quantity: 1,
            bookingDate: bookingDetails ? bookingDetails.date : undefined,
            bookingTime: bookingDetails ? bookingDetails.time : undefined,
        };
        newCart.push(newItem);
    }

    state.setCart(newCart);
    updateCartCountBadge();
    updateProfileUI();
    showNotification(`${service.title} added to cart!`, 'success');

    const cartIcon = document.getElementById('cart-icon-container');
    cartIcon?.classList.add('shake');
    setTimeout(() => cartIcon?.classList.remove('shake'), 600);

    return true;
};

// --- Page View Management ---
const hideAllPages = () => {
    const allContentIds = ['home-content', 'about-us-content', 'car-wash-content', 'battery-replacement-content', 'tyre-replacement-content', 'car-care-content', 'service-detail-page-content', 'my-order-content', 'my-orders-list-content', 'order-details-content', 'payment-method-content', 'order-confirmation-content'];
    allContentIds.forEach(id => document.getElementById(id)?.classList.add('hidden'));
    document.getElementById('nav-back-btn')?.classList.add('hidden');
}

/**
 * Stops all banner carousel intervals.
 */
const clearAllBannerIntervals = () => {
    for (const intervalId of bannerIntervals.values()) {
        clearInterval(intervalId);
    }
    bannerIntervals.clear();
};


export const showPage = (pageName) => {
    hideAllPages();
    
    // Clear temporary guest user details when navigating away from the checkout flow
    const checkoutPages = ['my-order', 'order-details', 'payment-method', 'order-confirmation'];
    if (!state.isLoggedIn && !checkoutPages.includes(pageName)) {
        state.setUserDetails(null);
    }

    // Stop all banner carousels when changing pages
    clearAllBannerIntervals();
    
    // Update nav links active state
    const servicePages = ['car-wash', 'battery-replacement', 'tyre-replacement', 'car-care'];
    const isHomePage = pageName === 'home';
    const isAboutPage = pageName === 'about-us';
    const isServicePage = servicePages.includes(pageName);

    document.querySelectorAll('#nav-home, #footer-nav-home').forEach(el => el.classList.toggle('active', isHomePage));
    document.querySelectorAll('#nav-about, #footer-nav-about').forEach(el => el.classList.toggle('active', isAboutPage));
    document.querySelectorAll('#nav-services, #footer-nav-services').forEach(el => el.classList.toggle('active', isServicePage));

    const backBtn = document.getElementById('nav-back-btn');
    if (backBtn) {
        backBtn.classList.toggle('hidden', isHomePage);
    }

    let activeContent = null;
    switch (pageName) {
        case 'home':
            activeContent = document.getElementById('home-content');
            renderReelsSection();
            renderTestimonialsSection();
            renderBannersSection();
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
            break;
        case 'car-care':
            activeContent = document.getElementById('car-care-content');
            renderCarCarePage();
            break;
        case 'my-order':
            activeContent = document.getElementById('my-order-content');
            renderOrderPage();
            break;
        case 'my-orders-list':
             if (!state.isLoggedIn) {
                showNotification("Please log in to view your orders.", "error");
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
};

const renderServiceDetailPage = (service) => {
    const container = document.getElementById('service-detail-page-content');
    if (!container) return;

    const mediaUrls = service.galleryUrls || (Array.isArray(service.imageUrls) ? service.imageUrls : [service.imageUrls]).filter(Boolean);
    const reviews = state.reviews.filter(r => r.serviceId === service.id);
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    const priceInfo = createPriceDisplay(service.price, service.mrp);
    
    const features = service.includedFeatures || (Array.isArray(service.features) ? service.features.map(f => ({ name: f })) : []);
    const specs = service.specifications ? Object.entries(service.specifications) : [];

    const isFirstMediaVideo = mediaUrls[0] && mediaUrls[0].toLowerCase().includes('.mp4');

    container.innerHTML = `
        <div class="service-detail-page-layout">
            <div class="service-detail-gallery">
                <div class="service-detail-main-image">
                    ${isFirstMediaVideo 
                        ? `<video src="${mediaUrls[0]}" controls autoplay loop muted playsinline></video>`
                        : `<img src="" alt="${service.title}">`
                    }
                </div>
                <div class="service-detail-thumbnails">
                    ${mediaUrls.map((url, index) => {
                        const isVideoThumb = url.toLowerCase().includes('.mp4');
                        return `
                            <div class="service-detail-thumb ${index === 0 ? 'active' : ''}" data-url="${url}" data-type="${isVideoThumb ? 'video' : 'image'}">
                                ${isVideoThumb 
                                    ? `<video src="${url}" muted playsinline></video>`
                                    : `<img src="" alt="Thumbnail ${index + 1}">`
                                }
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            <div class="service-detail-info">
                <h1>${service.title}</h1>
                ${createStarRatingDisplay(avgRating, reviews.length, 'full')}
                <p class="short-description">${service.description || 'No description available.'}</p>
                
                <div class="service-detail-price-box">
                    ${priceInfo.html}
                    ${service.promoText ? `<p class="promo-text">${service.promoText}</p>` : ''}
                    <div class="product-actions">
                        <button class="add-to-cart-btn" data-id="${service.id}">Add to Cart</button>
                        <button class="buy-now-btn" data-id="${service.id}">Buy Now</button>
                    </div>
                </div>
                
                <div class="tyre-card-tabs service-detail-tabs">
                    <button class="tab-button active" data-tab="features">What's Included</button>
                    ${specs.length > 0 ? `<button class="tab-button" data-tab="specifications">Specifications</button>` : ''}
                    <button class="tab-button" data-tab="reviews">Reviews (${reviews.length})</button>
                </div>
                <div class="service-detail-tab-content">
                    <div class="tab-pane active" data-tab-content="features">
                        <h4>What this service includes:</h4>
                        <ul class="features">
                            ${features.map(f => `<li>${f.name}</li>`).join('')}
                        </ul>
                    </div>
                    ${specs.length > 0 ? `
                    <div class="tab-pane hidden" data-tab-content="specifications">
                        ${specs.map(([key, value]) => `
                            <div class="spec-row">
                                <span class="spec-key">${key}</span>
                                <span class="spec-value">${value}</span>
                            </div>
                        `).join('')}
                    </div>` : ''}
                    <div class="tab-pane hidden" data-tab-content="reviews">
                        ${renderReviewsList(reviews)}
                    </div>
                </div>
            </div>
        </div>
    `;

    // --- Post-render logic and event listeners ---
    
    // Set main image if it's not a video
    if (!isFirstMediaVideo) {
        const mainImageEl = container.querySelector('.service-detail-main-image img');
        if (mainImageEl && mediaUrls[0]) setAsyncImage(mainImageEl, mediaUrls[0]);
    }
    
    // Set thumbnail images
    container.querySelectorAll('.service-detail-thumb img').forEach(thumbImg => {
        const thumbDiv = thumbImg.closest('.service-detail-thumb');
        if (thumbDiv) setAsyncImage(thumbImg, thumbDiv.dataset.url);
    });

    // Gallery logic
    const mainMediaContainer = container.querySelector('.service-detail-main-image');
    const thumbnails = container.querySelectorAll('.service-detail-thumb');
    
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            if (thumb.classList.contains('active')) return;
            
            thumbnails.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            
            const url = thumb.dataset.url;
            const type = thumb.dataset.type;
            
            if (type === 'video') {
                mainMediaContainer.innerHTML = `<video src="${url}" controls autoplay loop muted playsinline></video>`;
            } else {
                mainMediaContainer.innerHTML = `<img src="" alt="${service.title}">`;
                setAsyncImage(mainMediaContainer.querySelector('img'), url);
            }
        });
    });

    // Tab logic
    const tabs = container.querySelectorAll('.service-detail-tabs .tab-button');
    const panes = container.querySelectorAll('.service-detail-tab-content .tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('active')) return;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            panes.forEach(pane => {
                pane.classList.toggle('hidden', pane.dataset.tabContent !== tab.dataset.tab);
                pane.classList.toggle('active', pane.dataset.tabContent === tab.dataset.tab);
            });
        });
    });
};


export const showServiceDetailPage = (segmentSlug, serviceSlug) => {
    hideAllPages();
    const service = state.services.find(s => slugify(s.segment) === segmentSlug && s.slug === serviceSlug);
    const container = document.getElementById('service-detail-page-content');
    if (container) {
        if (service) {
            renderServiceDetailPage(service);
            container.classList.remove('hidden');
        } else {
            container.innerHTML = `<main class="service-page-container"><p class="no-data-message">Service not found. It may have been removed or the link is incorrect.</p></main>`;
            container.classList.remove('hidden');
        }

        const backBtn = document.getElementById('nav-back-btn');
        if (backBtn) {
            backBtn.classList.remove('hidden');
        }
        
        window.scrollTo(0, 0);
    }
};

export const renderAllPages = () => {
    renderReelsSection();
    renderTestimonialsSection();
    renderBannersSection();
    renderAboutUsPage();
    renderCarWashPage();
    renderTyreReplacementPage();
    renderBatteryReplacementPage();
    renderCarCarePage();
    updateProfileUI();
    updateCartCountBadge();
    // showPage('home'); // The router will now handle showing the initial page
};

// --- Review & Rating Helpers ---
function createStarRatingDisplay(rating, reviewCount, type = 'summary') {
    if (reviewCount === 0 && type === 'summary') {
        return `<div class="star-rating" aria-label="No reviews yet."><i class="far fa-star"></i><span class="review-count">New</span></div>`;
    }
    if (reviewCount === 0 && type === 'full') {
        return `<div class="star-rating" aria-label="No reviews yet."><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><span class="review-count">No reviews yet</span></div>`;
    }

    let starsHtml = '';
    const roundedRating = Math.round(rating * 2) / 2;
    for (let i = 1; i <= 5; i++) {
        if (roundedRating >= i) starsHtml += '<i class="fas fa-star"></i>';
        else if (roundedRating >= i - 0.5) starsHtml += '<i class="fas fa-star-half-alt"></i>';
        else starsHtml += '<i class="far fa-star"></i>';
    }

    const ratingText = type === 'summary' ? `${rating.toFixed(1)} <i class="fas fa-star"></i>` : `${rating.toFixed(1)}`;
    const countText = type === 'summary' ? `(${reviewCount})` : `(${reviewCount} ratings)`;

    return `
        <div class="star-rating" aria-label="Rated ${rating.toFixed(1)} out of 5 stars from ${reviewCount} reviews.">
            ${type === 'full' ? starsHtml : ''}
            <span class="rating-value">${ratingText}</span>
            <span class="review-count">${countText}</span>
        </div>
    `;
}

function renderReviewsList(reviews) {
    if (!reviews || reviews.length === 0) {
        return '<p class="no-data-message">No reviews for this service yet.</p>';
    }
    return `
        <div class="reviews-list">
            ${reviews.map(review => `
                <div class="review-item">
                    <div class="review-header">
                        <strong>${review.userName}</strong>
                        ${createStarRatingDisplay(review.rating, 1, 'full').replace('class="star-rating"', 'class="star-rating" style="margin-bottom:0;"').replace(/<span.*span>/g, '')}
                    </div>
                    <p class="review-comment">${review.comment}</p>
                </div>
            `).join('')}
        </div>
    `;
}

// --- Pricing Display Helper ---
function createPriceDisplay(price, mrp) {
    if (!price) return { html: '<div class="price-container"></div>', discount: 0 };

    const numericPrice = parseFloat(String(price).replace(/[^\d.]/g, ''));
    const numericMrp = mrp ? parseFloat(String(mrp).replace(/[^\d.]/g, '')) : 0;
    
    let discount = 0;
    let html = '';

    if (numericMrp > numericPrice) {
        discount = Math.round(((numericMrp - numericPrice) / numericMrp) * 100);
        html = `<div class="price-line">
                    <span class="offer-price">₹${numericPrice.toLocaleString()}</span>
                    <del class="mrp-price">₹${numericMrp.toLocaleString()}</del>
                    ${discount > 0 ? `<span class="discount">${discount}% OFF</span>` : ''}
                </div>`;
    } else {
        html = `<div class="price-line"><span class="offer-price">₹${numericPrice.toLocaleString()}</span></div>`;
    }
    return { html, discount };
}

// --- Component Creation Functions ---
const createReelCard = (reel) => {
    const card = document.createElement('div');
    card.className = 'reel-card';
    card.innerHTML = `
        <video src="${reel.videoUrl}" autoplay loop muted playsinline></video>
        <div class="reel-card-overlay">
            <h3 class="reel-card-title">${reel.title}</h3>
        </div>
    `;
    return card;
};

const createTestimonialCard = (testimonial) => {
    const card = document.createElement('div');
    card.className = 'reel-card testimonial-card'; // Reuse reel-card styles
    
    const isVideo = typeof testimonial.mediaUrl === 'string' && testimonial.mediaUrl.toLowerCase().includes('.mp4');

    const mediaTag = isVideo
        ? `<video src="${testimonial.mediaUrl}" autoplay loop muted playsinline></video>`
        : `<div class="main-image-container"><img src="" alt="Testimonial from ${testimonial.customerName}" loading="lazy"></div>`;

    card.innerHTML = `
        ${mediaTag}
        <div class="reel-card-overlay">
            <p class="testimonial-text">"${testimonial.text}"</p>
            <h3 class="reel-card-title testimonial-author">- ${testimonial.customerName}</h3>
        </div>
    `;

    if (!isVideo) {
        const img = card.querySelector('img');
        if (img && testimonial.mediaUrl) setAsyncImage(img, testimonial.mediaUrl);
    }
    return card;
};

const createBannerItem = (banner) => {
    if (banner.status !== 'active') {
        return document.createDocumentFragment();
    }

    const hasLink = banner.linkUrl && banner.linkUrl.trim() !== '';
    const wrapper = document.createElement(hasLink ? 'a' : 'div');
    wrapper.className = 'banner-item';
    if(hasLink) {
        wrapper.setAttribute('href', banner.linkUrl);
        wrapper.setAttribute('target', '_blank');
        wrapper.setAttribute('rel', 'noopener noreferrer');
    }
    
    wrapper.style.width = '100%';
    
    const img = document.createElement('img');
    img.alt = banner.title;
    img.loading = 'lazy';
    
    if (banner.scaling === 'fit') {
        img.style.objectFit = 'contain';
    } else if (banner.scaling === 'fill') {
        img.style.objectFit = 'cover';
    } else {
        img.style.objectFit = 'fill';
    }
    
    setAsyncImage(img, banner.imageUrl);
    wrapper.appendChild(img);
    return wrapper;
};

function startBannerCarousel(wrapper, count, progressBar, containerSelector) {
    let currentIndex = 0;
    const container = wrapper.parentElement;
    if (!container) return;

    const showNextBanner = () => {
        const itemHeight = container.offsetHeight;
        if (itemHeight === 0) return; // Don't run if container is not visible

        currentIndex = (currentIndex + 1) % count;
        wrapper.style.transform = `translateY(-${currentIndex * itemHeight}px)`;

        if (progressBar) {
            progressBar.classList.remove('animate');
            void progressBar.offsetWidth;
            progressBar.classList.add('animate');
        }
    };

    if (progressBar) {
        progressBar.classList.add('animate');
    }
    
    const intervalId = setInterval(showNextBanner, BANNER_INTERVAL_DURATION);
    bannerIntervals.set(containerSelector, intervalId);
}

const renderBannerCarousel = (placement, sectionSelector, containerSelector, progressBarSelector) => {
    const section = document.querySelector(sectionSelector);
    const container = document.querySelector(containerSelector);
    const progressBarContainer = section?.querySelector('.banner-progress-bar-container');
    const progressBar = document.querySelector(progressBarSelector);

    // Clear previous interval for this specific carousel
    if (bannerIntervals.has(containerSelector)) {
        clearInterval(bannerIntervals.get(containerSelector));
        bannerIntervals.delete(containerSelector);
    }

    if (!container || !section || !progressBarContainer || !progressBar) return;

    const activeBanners = state.banners.filter(b => b.status === 'active' && b.placement === placement);

    if (activeBanners.length > 0) {
        container.innerHTML = `<div class="banner-wrapper"></div>`;
        const wrapper = container.querySelector('.banner-wrapper');
        
        activeBanners.forEach(banner => {
            wrapper.appendChild(createBannerItem(banner));
        });

        section.classList.remove('hidden');

        if (activeBanners.length > 1) {
            progressBarContainer.classList.remove('hidden');
            startBannerCarousel(wrapper, activeBanners.length, progressBar, containerSelector);
        } else {
            progressBarContainer.classList.add('hidden');
        }
    } else {
        section.classList.add('hidden');
    }
};

const createServiceListCard = (service) => {
    const card = document.createElement('div');
    card.className = 'service-list-card';
    card.dataset.id = service.id;

    const reviews = state.reviews.filter(r => r.serviceId === service.id);
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    const priceInfo = createPriceDisplay(service.price, service.mrp);
    
    const featuresPreview = (service.includedFeatures && service.includedFeatures.length > 0)
        ? service.includedFeatures
        : (Array.isArray(service.features) ? service.features.map(f => ({ name: f })) : []);

    let primaryMediaUrl;
    if (service.segment && service.segment.trim().toLowerCase() === 'car wash') {
        primaryMediaUrl = service.galleryUrls?.[0];
    } else {
        primaryMediaUrl = (Array.isArray(service.imageUrls) ? service.imageUrls[0] : service.imageUrls) || service.videoSrc;
    }
        
    const isVideo = typeof primaryMediaUrl === 'string' && primaryMediaUrl.toLowerCase().includes('.mp4');
    const serviceUrl = `/services/${slugify(service.segment)}/${service.slug}`;

    card.innerHTML = `
        <div class="media">
            ${isVideo 
                ? `<video class="media-img" src="${primaryMediaUrl}" autoplay loop muted playsinline></video>`
                : `<img class="media-img" src="" alt="${service.title}" loading="lazy">`
            }
        </div>
        <div class="info">
            <div class="card-content">
                <h3><a href="${serviceUrl}">${service.title}</a></h3>
                ${createStarRatingDisplay(avgRating, reviews.length)}
                <ul class="features-preview">
                    ${featuresPreview.slice(0, 3).map(f => `<li>${f.name}</li>`).join('')}
                </ul>
                <a href="${serviceUrl}" class="details-link">${featuresPreview.length > 3 ? `+${featuresPreview.length - 3} more ` : ''}View Details</a>
            </div>
            <div class="card-footer">
                <div class="price-container">
                    ${priceInfo.html}
                    ${service.promoText ? `<p class="promo-text">${service.promoText}</p>` : ''}
                </div>
                <div class="product-actions">
                    <button class="add-to-cart-btn" data-id="${service.id}">Add to Cart</button>
                    <button class="buy-now-btn" data-id="${service.id}">Buy Now</button>
                </div>
            </div>
        </div>
    `;

    if (!isVideo) {
        const img = card.querySelector('.media-img');
        if (img && primaryMediaUrl) {
            setAsyncImage(img, primaryMediaUrl);
        } else if (img) {
            img.parentElement?.classList.add('no-image');
        }
    }

    return card;
};

const createBatteryProductCard = (service) => {
    const card = document.createElement('div');
    card.className = 'battery-product-card';
    card.dataset.id = service.id;

    const images = (Array.isArray(service.imageUrls) ? service.imageUrls : (typeof service.imageUrls === 'string' ? [service.imageUrls] : [])).filter(Boolean);
    const reviews = state.reviews.filter(r => r.serviceId === service.id);
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    
    const priceDiv = document.createElement('div');
    priceDiv.innerHTML = createPriceDisplay(service.price, service.mrp).html;
    const offerPrice = priceDiv.querySelector('.offer-price');
    const mrpPrice = priceDiv.querySelector('.mrp-price');
    const discount = priceDiv.querySelector('.discount');
    if(offerPrice) offerPrice.className = 'current-price';
    if(mrpPrice) mrpPrice.className = 'original-price';
    if(discount) discount.className = 'discount-badge';

    const compatibleVehicles = Array.isArray(service.features) ? service.features.join(', ') : '';
    const brand = service.specifications?.Brand || service.tyre_brand || 'N/A';
    const soldBy = service.specifications?.['Sold by'] || brand;
    const serviceUrl = `/services/${slugify(service.segment)}/${service.slug}`;

    card.innerHTML = `
        <div class="battery-image-gallery">
            <div class="main-image-wrapper">
                <img class="main-image" src="" alt="${service.title}">
            </div>
            <div class="thumbnail-list">
                ${images.map((imgUrl, index) => `
                    <img class="thumbnail ${index === 0 ? 'active' : ''}" src="" data-src="${imgUrl}" alt="Thumbnail ${index + 1}">
                `).join('')}
            </div>
        </div>
        <div class="battery-details">
            <div class="card-content">
                <div class="battery-header">
                    <h3><a href="${serviceUrl}">${service.title}</a></h3>
                    <div class="actions">
                        <button class="action-btn-icon" aria-label="Add to wishlist"><i class="far fa-heart"></i></button>
                        <button class="action-btn-icon" aria-label="Share"><i class="fas fa-share-alt"></i></button>
                    </div>
                </div>
                <div class="reviews-summary">
                    ${createStarRatingDisplay(avgRating, reviews.length, 'full')}
                    <span class="assured-badge">A Big Engine's Assured</span>
                </div>
                <div class="product-info-table">
                    <div class="info-row">
                        <span class="label">Brand</span>
                        <span class="value">${brand}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Sold by</span>
                        <span class="value">${soldBy}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Compatible Vehicles</span>
                        <span class="value">${compatibleVehicles}</span>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <div class="price-section">
                    ${priceDiv.innerHTML}
                </div>
                <div class="product-actions">
                    <button class="add-to-cart-btn" data-id="${service.id}">Add to Cart</button>
                    <button class="buy-now-btn" data-id="${service.id}">Buy Now</button>
                </div>
            </div>
        </div>
    `;

    const mainImage = card.querySelector('.main-image');
    const thumbnails = card.querySelectorAll('.thumbnail');
    const updateMainImage = (url) => {
        if (mainImage && url) setAsyncImage(mainImage, url);
    };

    thumbnails.forEach(thumb => {
        const thumbUrl = thumb.dataset.src;
        if (thumbUrl) {
            setAsyncImage(thumb, thumbUrl);
            thumb.addEventListener('click', () => {
                updateMainImage(thumbUrl);
                thumbnails.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
        }
    });

    if (images.length > 0) {
        updateMainImage(images[0]);
    }

    return card;
};

const createTyreCard = (service) => {
    const card = document.createElement('div');
    card.className = 'tyre-card';
    card.dataset.id = service.id;

    const features = Array.isArray(service.features) ? service.features : [];
    const specs = service.specifications ? Object.entries(service.specifications) : [];
    const images = Array.isArray(service.imageUrls) ? service.imageUrls : (typeof service.imageUrls === 'string' ? [service.imageUrls] : []);
    const reviews = state.reviews.filter(r => r.serviceId === service.id);
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    
    const cleanTitle = service.title;
    const serviceUrl = `/services/${slugify(service.segment)}/${service.slug}`;

    card.innerHTML = `
        <div class="tyre-card-gallery" data-current-index="0">
            <div class="main-image-container">
                <img class="main-gallery-image" src="" alt="${service.title}" loading="lazy">
                ${images.length > 1 ? `
                    <button class="carousel-btn prev" aria-label="Previous image"><i class="fas fa-chevron-left"></i></button>
                    <button class="carousel-btn next" aria-label="Next image"><i class="fas fa-chevron-right"></i></button>
                ` : ''}
            </div>
        </div>
        <div class="tyre-card-details">
            <div class="card-content">
                <h3><a href="${serviceUrl}">${cleanTitle}</a></h3>
                ${createStarRatingDisplay(avgRating, reviews.length, 'full')}
                <div class="tyre-card-tabs">
                    <button class="tab-button active" data-tab="features">Features</button>
                    <button class="tab-button" data-tab="specifications">Specifications</button>
                    <button class="tab-button" data-tab="reviews">Reviews (${reviews.length})</button>
                </div>
                <div class="tyre-card-tab-content">
                    <div class="tab-pane active" data-tab-content="features">
                        <ul class="features">
                            ${(features).map(f => `<li>${f}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="tab-pane hidden" data-tab-content="specifications">
                        ${specs.map(([key, value]) => `
                            <div class="spec-row">
                                <span class="spec-key">${key}</span>
                                <span class="spec-value">${value}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="tab-pane hidden" data-tab-content="reviews">
                        ${renderReviewsList(reviews)}
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <div class="price-container">
                     ${createPriceDisplay(service.price, service.mrp).html}
                </div>
                <div class="product-actions">
                    <button class="add-to-cart-btn" data-id="${service.id}">Add to Cart</button>
                    <button class="buy-now-btn" data-id="${service.id}">Buy Now</button>
                </div>
            </div>
        </div>
    `;
    
    const mainImage = card.querySelector('.main-gallery-image');
    const tabs = card.querySelectorAll('.tab-button');
    const panes = card.querySelectorAll('.tab-pane');
    const gallery = card.querySelector('.tyre-card-gallery');

    if (mainImage && images.length > 0) {
        setAsyncImage(mainImage, images[0]);
    }

    const updateImage = (newIndex) => {
        if (!gallery || !mainImage || !images[newIndex]) return;
        gallery.dataset.currentIndex = String(newIndex);
        setAsyncImage(mainImage, images[newIndex]);
    };

    if (gallery && images.length > 1) {
        const prevBtn = gallery.querySelector('.carousel-btn.prev');
        const nextBtn = gallery.querySelector('.carousel-btn.next');

        prevBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            let currentIndex = parseInt(gallery.dataset.currentIndex || '0');
            let newIndex = (currentIndex - 1 + images.length) % images.length;
            updateImage(newIndex);
        });

        nextBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            let currentIndex = parseInt(gallery.dataset.currentIndex || '0');
            let newIndex = (currentIndex + 1) % images.length;
            updateImage(newIndex);
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if(tab.classList.contains('active')) return;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            panes.forEach(pane => {
                pane.classList.toggle('hidden', pane.dataset.tabContent !== tab.dataset.tab);
                pane.classList.toggle('active', pane.dataset.tabContent === tab.dataset.tab);
            });
        });
    });

    return card;
};

const createCartItemComponent = (item) => {
    const itemElement = document.createElement('div');
    const cartItemId = `${item.id}-${item.bookingDate}-${item.bookingTime}`;
    itemElement.className = 'cart-item';
    itemElement.dataset.cartItemId = cartItemId;
    
    const bookingInfoHtml = item.bookingDate && item.bookingTime ? `
        <div class="cart-item-booking-info">
            <i class="fas fa-calendar-check"></i> ${new Date(item.bookingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short'})}, ${item.bookingTime}
        </div>
    ` : '';

    const isVideo = item.itemType === 'video';
    const mediaTag = isVideo 
        ? `<video src="${item.thumbnailSrc}" autoplay loop muted playsinline></video>` 
        : `<img src="" alt="${item.name}" loading="lazy">`;

    itemElement.innerHTML = `
        <div class="cart-item-thumbnail">
            ${mediaTag}
        </div>
        <div class="cart-item-details">
            <h4>${item.name}</h4>
            <p class="price">₹${item.price.toFixed(2)}</p>
            ${bookingInfoHtml}
        </div>
        <div class="cart-item-actions">
            <div class="quantity-selector">
                <button class="quantity-btn decrease" aria-label="Decrease quantity">-</button>
                <input type="number" class="quantity-input" value="${item.quantity}" min="1" readonly>
                <button class="quantity-btn increase" aria-label="Increase quantity">+</button>
            </div>
            <button class="remove-item-btn">Remove</button>
        </div>
    `;
    
    if (!isVideo) {
        const img = itemElement.querySelector('img');
        if(img && item.thumbnailSrc) {
            setAsyncImage(img, item.thumbnailSrc);
        }
    }

    itemElement.querySelector('.increase')?.addEventListener('click', () => updateQuantity(cartItemId, 1));
    itemElement.querySelector('.decrease')?.addEventListener('click', () => updateQuantity(cartItemId, -1));
    itemElement.querySelector('.remove-item-btn')?.addEventListener('click', () => removeItem(cartItemId));
    
    return itemElement;
};

const createPaginationControls = (category, totalItems, currentPage) => {
    const totalPages = Math.ceil(totalItems / state.PRODUCTS_PER_PAGE);
    if (totalPages <= 1) return '';

    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';

    return `
        <div class="pagination-controls">
            <button class="pagination-btn prev" data-category="${category}" data-page="${currentPage - 1}" ${prevDisabled}>
                <i class="fas fa-arrow-left"></i> Previous
            </button>
            <span class="pagination-info">Page ${currentPage} of ${totalPages}</span>
            <button class="pagination-btn next" data-category="${category}" data-page="${currentPage + 1}" ${nextDisabled}>
                Next <i class="fas fa-arrow-right"></i>
            </button>
        </div>
    `;
};


// --- Page Rendering Functions ---
export const renderReelsSection = () => {
    const container = document.getElementById('reels-container');
    const section = document.getElementById('reels-section');
    if (!container || !section) return;

    container.innerHTML = '';
    if (state.reels.length > 0) {
        state.reels.forEach(reel => {
            container.appendChild(createReelCard(reel));
        });
        section.classList.remove('hidden');
    } else {
        section.classList.add('hidden');
    }
};

export const renderTestimonialsSection = () => {
    const container = document.getElementById('testimonials-container');
    const section = document.getElementById('testimonials-section');
    if (!container || !section) return;

    container.innerHTML = '';
    if (state.testimonials.length > 0) {
        state.testimonials.forEach(testimonial => {
            container.appendChild(createTestimonialCard(testimonial));
        });
        section.classList.remove('hidden');
    } else {
        section.classList.add('hidden');
    }
};

export const renderBannersSection = () => {
    renderBannerCarousel('home-body', '#banner-section', '#banner-container', '#banner-progress-bar');
};

export const renderAboutUsPage = () => {
    const container = document.getElementById('about-us-content');
    if (!container) return;

    container.innerHTML = `
        <main class="about-us-container">
            <div class="about-us-hero">
                <img src="https://pub-d1d6c35dc7024f819f155246a42ea32b.r2.dev/Website%20Assets/Banners/Untitled%20design%20(2).png" alt="A Big Engine technician working on a car">
                <div class="about-us-hero-overlay">
                    <h1>Your Trusted Car Care Partner</h1>
                </div>
            </div>
            
            <div class="about-us-content-wrapper">
                <section class="about-section about-us-intro">
                    <p>At A Big Engine, we believe car care should be easy, convenient, and delivered right to your doorstep. We are redefining the service experience in and around Krishnanagar, saving you time while providing quality, trust, and a brand experience you can rely on.</p>
                </section>
                
                <section class="about-section">
                    <h2>What Makes Us Different</h2>
                    <p class="section-subtitle">Our commitment to excellence sets us apart. We bring the workshop to you with a focus on quality, convenience, and professional expertise.</p>
                    <div class="about-us-grid">
                        <div class="about-us-card">
                            <div class="card-icon"><i class="fas fa-truck"></i></div>
                            <h3>Complete Convenience</h3>
                            <p>Every service, from a simple wash to complex tyre alignment, is performed at your home or office. No more waiting rooms.</p>
                        </div>
                        <div class="about-us-card">
                            <div class="card-icon"><i class="fas fa-users-cog"></i></div>
                            <h3>Skilled Professionals</h3>
                            <p>Our expert technicians are trained and equipped with modern tools to ensure every job is handled with precision and care.</p>
                        </div>
                        <div class="about-us-card">
                            <div class="card-icon"><i class="fas fa-shield-alt"></i></div>
                            <h3>Quality Assured</h3>
                            <p>We use only trusted, high-quality products and parts to deliver long-lasting results and complete peace of mind.</p>
                        </div>
                    </div>
                </section>

                <section class="about-section">
                    <h2>Our Services at Your Doorstep</h2>
                    <p class="section-subtitle">A comprehensive range of services designed to meet all your vehicle's needs, wherever you are.</p>
                    <div class="about-us-grid">
                         <div class="about-us-card">
                            <div class="card-icon"><i class="fas fa-cogs"></i></div>
                            <h3>Periodic Servicing</h3>
                            <p>Regular maintenance and repairs to keep your car running smoothly.</p>
                        </div>
                         <div class="about-us-card">
                            <div class="card-icon"><i class="fas fa-car-side"></i></div>
                            <h3>Tyres & Batteries</h3>
                            <p>Doorstep replacement, balancing, and alignment for tyres and batteries.</p>
                        </div>
                         <div class="about-us-card">
                            <div class="card-icon"><i class="fas fa-shower"></i></div>
                            <h3>Cleaning & Detailing</h3>
                            <p>Professional car washing, detailing, polishing, and ceramic coating.</p>
                        </div>
                        <div class="about-us-card">
                            <div class="card-icon"><i class="fas fa-music"></i></div>
                            <h3>Accessories</h3>
                            <p>Premium car accessories including sound systems & Android Auto setups.</p>
                        </div>
                    </div>
                </section>

                <section class="about-section">
                    <h2>Why Choose A Big Engine?</h2>
                     <div class="why-choose-us-layout">
                        <div class="why-choose-us-content">
                            <p>We are not just another service provider – we are a digital platform that connects you with Hindustan Autocare’s trusted expertise, now delivered straight to your home. Customers in Krishnanagar know us for our reliability and commitment.</p>
                            <ul class="check-list">
                                <li><i class="fas fa-check-circle"></i> Hassle-free doorstep service</li>
                                <li><i class="fas fa-check-circle"></i> Skilled and reliable professionals</li>
                                <li><i class="fas fa-check-circle"></i> Quick turnaround and delivery</li>
                                <li><i class="fas fa-check-circle"></i> Competitive and transparent prices</li>
                            </ul>
                        </div>
                        <div class="why-choose-us-image">
                           <img src="https://pub-d1d6c35dc7024f819f155246a42ea32b.r2.dev/Website%20Assets/Elements/About/ab-img-2.jpg" alt="Mechanic inspecting a car engine">
                        </div>
                    </div>
                </section>
            </div>

            <section class="about-us-cta">
                <h2>Ready for a Better Car Service Experience?</h2>
                <p>Explore our wide range of services and book your slot today. Let us take care of your car while you focus on what matters most.</p>
                <a href="/services" class="btn">Explore Services</a>
            </section>
        </main>
    `;
};

// Helper to render a list of services with pagination
const renderPaginatedServiceList = (
    pageId, 
    listSelector, 
    services, 
    cardCreator, 
    category, 
    emptyMessage
) => {
    const pageContainer = document.getElementById(pageId);
    if (!pageContainer) return;

    const listContainer = pageContainer.querySelector(listSelector);
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const currentPage = state.pagination[category] || 1;
    const startIndex = (currentPage - 1) * state.PRODUCTS_PER_PAGE;
    const endIndex = startIndex + state.PRODUCTS_PER_PAGE;
    const paginatedServices = services.slice(startIndex, endIndex);

    if (services.length === 0) {
        listContainer.innerHTML = `<p class="no-data-message">${emptyMessage}</p>`;
    } else {
        paginatedServices.forEach(service => listContainer.appendChild(cardCreator(service)));
    }

    const oldPagination = pageContainer.querySelector('.pagination-controls');
    oldPagination?.remove();

    const paginationHtml = createPaginationControls(category, services.length, currentPage);
    pageContainer.querySelector('main')?.insertAdjacentHTML('beforeend', paginationHtml);
};

export const renderCarWashPage = () => {
    const carWashServices = state.services.filter(s => s.segment && s.segment.trim().toLowerCase() === 'car wash');
    renderPaginatedServiceList(
        'car-wash-content',
        '.service-packages-list',
        carWashServices,
        createServiceListCard,
        'car-wash',
        'No car wash services available at the moment.'
    );
};

export const renderCarCarePage = () => {
    const carCareServices = state.services.filter(s => s.segment && s.segment.trim().toLowerCase() === 'car care');
    renderPaginatedServiceList(
        'car-care-content',
        '.service-packages-list',
        carCareServices,
        createServiceListCard,
        'car-care',
        'No car care services available at the moment.'
    );
};

export const renderBatteryReplacementPage = () => {
    const batteryServices = state.services.filter(s => s.segment && s.segment.trim().toLowerCase() === 'battery replacement');
    renderPaginatedServiceList(
        'battery-replacement-content',
        '.service-packages-list',
        batteryServices,
        createBatteryProductCard,
        'battery-replacement',
        'No battery replacement services available at the moment.'
    );
};

export const renderTyreReplacementPage = () => {
    const pageContainer = document.getElementById('tyre-replacement-content');
    if (!pageContainer) return;

    const carIsSelected = !!(state.userDetails?.selectedVariant || state.guestSelectedCar?.selectedVariant);
    
    const bannerHtml = `
        <section class="page-banner-section hidden" id="tyre-replacement-banner-section">
            <div class="container">
                <div class="banner-container" id="tyre-replacement-banner-container"></div>
                <div class="banner-progress-bar-container hidden">
                    <div id="tyre-replacement-banner-progress-bar" class="banner-progress-bar"></div>
                </div>
            </div>
        </section>
    `;

    if (!carIsSelected) {
        pageContainer.innerHTML = `
            <main class="service-page-container">
                ${bannerHtml}
                <h1>Tyre Replacement</h1>
                <div class="select-car-prompt">
                    <i class="fas fa-car-side"></i>
                    <h3>Please select your car first</h3>
                    <p>This will help us show you the correct tyre sizes for your vehicle.</p>
                    <button class="btn" id="select-car-prompt-btn">Select Your Car</button>
                </div>
            </main>
        `;
    } else {
        const selectedCar = state.userDetails?.selectedVariant ? state.userDetails : state.guestSelectedCar;
        const carName = selectedCar.carBrandModel;
        
        let modelImageUrl = '';
        if (selectedCar?.selectedVariant && Array.isArray(state.carDatabase)) {
            const brandData = state.carDatabase.find(b => b.name === selectedCar.selectedVariant.brand);
            if (brandData) {
                const modelKey = Object.keys(brandData.models).find(k => k.toLowerCase() === selectedCar.selectedVariant.model.toLowerCase());
                if (modelKey) {
                    modelImageUrl = brandData.models[modelKey]?.image || '';
                }
            }
        }

        pageContainer.innerHTML = `
            <main class="service-page-container">
                ${bannerHtml}
                <h1>Tyre Replacement</h1>
                <div class="current-vehicle-bar">
                    <div class="current-vehicle-info">
                        ${modelImageUrl ? `<img src="${modelImageUrl}" alt="${carName}" class="vehicle-image">` : '<i class="fas fa-check-circle"></i>'}
                        <span>Showing tyres for: <strong>${carName}</strong></span>
                    </div>
                    <button class="text-btn" id="change-vehicle-btn">Change Vehicle</button>
                </div>
                <div id="tyre-filter-bar" class="tyre-filter-bar">
                    <!-- Tyre filters will be injected here -->
                </div>
                <div class="service-packages-grid" id="tyre-services-grid">
                    <!-- Tyre service cards will be generated here -->
                </div>
            </main>
        `;
        
        renderTyreFilterBar();

        const container = pageContainer.querySelector('#tyre-services-grid');
        const allTyreServices = state.services.filter(s => s.segment && s.segment.trim().toLowerCase() === 'tyre replacement');
        const { brand, width, profile, radius } = state.tyreFilters;

        const filteredServices = allTyreServices.filter(service => {
            return (!brand || (service.tyre_brand && service.tyre_brand.toLowerCase() === brand.toLowerCase())) &&
                   (!width || service.tyre_width == width) &&
                   (!profile || service.tyre_profile == profile) &&
                   (!radius || service.tyre_radius == radius);
        });
        
        container.innerHTML = '';
        const currentPage = state.pagination['tyre-replacement'] || 1;
        const startIndex = (currentPage - 1) * state.PRODUCTS_PER_PAGE;
        const endIndex = startIndex + state.PRODUCTS_PER_PAGE;
        const paginatedServices = filteredServices.slice(startIndex, endIndex);

        if (filteredServices.length === 0) {
            container.innerHTML = `<p class="no-data-message">No tyres match the current filter. Try adjusting the filters or selecting a different vehicle.</p>`;
        } else {
            paginatedServices.forEach(service => container.appendChild(createTyreCard(service)));
        }

        const mainContainer = pageContainer.querySelector('main.service-page-container');
        const oldPagination = mainContainer.querySelector('.pagination-controls');
        oldPagination?.remove();
        const paginationHtml = createPaginationControls('tyre-replacement', filteredServices.length, currentPage);
        mainContainer.insertAdjacentHTML('beforeend', paginationHtml);
    }
    
    // Render the banner carousel after the DOM is updated
    renderBannerCarousel('tyre-replacement', '#tyre-replacement-banner-section', '#tyre-replacement-banner-container', '#tyre-replacement-banner-progress-bar');
};

const renderTyreFilterBar = () => {
    const filterBar = document.getElementById('tyre-filter-bar');
    if (!filterBar) return;

    const allTyreServices = state.services.filter(s => s.segment === 'Tyre Replacement' && s.tyre_brand);
    
    const availableBrands = [...new Set(allTyreServices.map(s => s.tyre_brand))].filter(Boolean).sort();
    const availableWidths = [...new Set(allTyreServices.map(s => s.tyre_width))].filter(Boolean).sort((a, b) => Number(a) - Number(b));
    const availableProfiles = [...new Set(allTyreServices.map(s => s.tyre_profile))].filter(Boolean).sort((a, b) => Number(a) - Number(b));
    const availableRadii = [...new Set(allTyreServices.map(s => s.tyre_radius))].filter(Boolean).sort((a, b) => Number(a) - Number(b));

    const createOptions = (options, selectedValue) => 
        options.map(opt => `<option value="${opt}" ${String(opt) === String(selectedValue) ? 'selected' : ''}>${opt}</option>`).join('');

    filterBar.innerHTML = `
        <div class="filter-group">
            <label>Brand</label>
            <select data-filter="brand">
                <option value="">All Brands</option>
                ${createOptions(availableBrands, state.tyreFilters.brand)}
            </select>
        </div>
        <div class="filter-group">
            <label>Width</label>
            <select data-filter="width">
                <option value="">All Widths</option>
                ${createOptions(availableWidths, state.tyreFilters.width)}
            </select>
        </div>
        <div class="filter-group">
            <label>Profile</label>
            <select data-filter="profile">
                <option value="">All Profiles</option>
                ${createOptions(availableProfiles, state.tyreFilters.profile)}
            </select>
        </div>
        <div class="filter-group">
            <label>Radius</label>
            <select data-filter="radius">
                <option value="">All Radii</option>
                ${createOptions(availableRadii, state.tyreFilters.radius)}
            </select>
        </div>
        <button id="tyre-filter-reset-btn">Reset Filters</button>
    `;

    filterBar.classList.remove('hidden');
};

const updateQuantity = (cartItemId, change) => {
    const newCart = [...state.cart];
    const itemIndex = newCart.findIndex(item => `${item.id}-${item.bookingDate}-${item.bookingTime}` === cartItemId);
    
    if (itemIndex > -1) {
        newCart[itemIndex].quantity += change;
        if (newCart[itemIndex].quantity <= 0) {
            newCart.splice(itemIndex, 1);
        }
        state.setCart(newCart);
        renderOrderPage(); // Re-render the cart
    }
};

const removeItem = (cartItemId) => {
    const newCart = state.cart.filter(item => `${item.id}-${item.bookingDate}-${item.bookingTime}` !== cartItemId);
    state.setCart(newCart);
    renderOrderPage(); // Re-render the cart
};

const updateOrderSummary = () => {
    const container = document.getElementById('order-summary-container');
    if (!container) return;
    
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.18; // Example tax
    const total = subtotal + tax;
    
    container.innerHTML = `
        <h3>Order Summary</h3>
        <div class="summary-row">
            <span>Subtotal</span>
            <span>₹${subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-row">
            <span>Tax (18%)</span>
            <span>₹${tax.toFixed(2)}</span>
        </div>
        <div class="summary-row total">
            <span>Total</span>
            <span>₹${total.toFixed(2)}</span>
        </div>
        <button class="checkout-btn" ${state.cart.length === 0 ? 'disabled' : ''}>Proceed to Checkout</button>
    `;

    container.querySelector('.checkout-btn')?.addEventListener('click', () => {
        if (!state.isLoggedIn && !state.userDetails) {
            openAuthModal(true); // Open auth and flag for redirect to checkout
        } else {
            window.navigate('/order-details');
        }
    });
};

export const renderOrderPage = () => {
    const container = document.getElementById('order-view-container');
    if (!container) return;

    if (state.cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart-view">
                <i class="fas fa-shopping-cart"></i>
                <h3>Your Cart is Empty</h3>
                <p>Looks like you haven't added anything to your cart yet.</p>
                <a href="/services/car-wash" class="btn">Explore Services</a>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="order-layout">
                <div class="cart-items-list">
                    <!-- Cart items will be injected here -->
                </div>
                <div class="order-summary" id="order-summary-container">
                    <!-- Summary will be injected here -->
                </div>
            </div>
        `;
        const listContainer = container.querySelector('.cart-items-list');
        state.cart.forEach(item => listContainer.appendChild(createCartItemComponent(item)));
        updateOrderSummary();
    }
    updateCartCountBadge();
};

export const renderMyOrdersListPage = () => {
    const container = document.getElementById('orders-list-view-container');
    if (!container) return;

    if (state.userOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-cart-view">
                <i class="fas fa-box-open"></i>
                <h3>No Orders Yet</h3>
                <p>You haven't placed any orders with us. Let's change that!</p>
                <a href="/services/car-wash" class="btn">Browse Services</a>
            </div>
        `;
        return;
    }

    const sortedOrders = [...state.userOrders].sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

    container.innerHTML = `
        <div class="orders-list-container">
            ${sortedOrders.map(order => createOrderCard(order)).join('')}
        </div>
    `;
};


const createOrderCard = (order) => {
    const orderDate = new Date(order.orderDate);
    const items = typeof order.itemsJson === 'string' ? JSON.parse(order.itemsJson) : order.itemsJson;

    return `
        <div class="order-card">
            <div class="order-card-header">
                <div class="order-card-header-info">ORDER PLACED<span>${orderDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                <div class="order-card-header-info">TOTAL<span>₹${order.totalAmount.toLocaleString()}</span></div>
                <div class="order-card-header-info">ORDER ID<span>#${order.orderId}</span></div>
                <div class="order-status ${order.status.toLowerCase()}">${order.status}</div>
            </div>
            <div class="order-card-body">
                <div class="order-card-items-list">
                ${items.map(item => {
                    const isVideo = item.itemType === 'video';
                    const mediaTag = isVideo 
                        ? `<video src="${item.thumbnailSrc}" muted playsinline></video>` 
                        : `<img src="${item.thumbnailSrc || ''}" alt="${item.name}" loading="lazy">`;
                    
                    const service = state.services.find(s => s.id === item.id);
                    const serviceUrl = service ? `/services/${slugify(service.segment)}/${service.slug}` : '#';

                    return `
                    <div class="order-item-row">
                        ${mediaTag}
                        <div class="order-item-info-actions">
                            <div class="order-item-info">
                                <a href="${serviceUrl}" class="order-item-product-link">${item.name}</a>
                                <p>Quantity: ${item.quantity}</p>
                            </div>
                            <button class="review-order-item-btn btn" data-service-id="${item.id}">Write a Review</button>
                        </div>
                    </div>`
                }).join('')}
                </div>
            </div>
            <div class="order-card-footer">
                <button class="view-order-details-btn btn" data-order-id="${order.orderId}">View Details</button>
            </div>
        </div>
    `;
};

const createCheckoutProgressBar = (currentStep) => {
    const steps = ['Details', 'Payment', 'Confirmation'];
    const icons = ['fa-user-check', 'fa-credit-card', 'fa-check-circle'];
    return `
        <div class="checkout-progress-bar">
            ${steps.map((step, index) => {
                const stepIndex = index + 1;
                let status = '';
                if (stepIndex < currentStep) status = 'completed';
                if (stepIndex === currentStep) status = 'active';
                return `
                    <div class="progress-node ${status}">
                        <div class="progress-icon"><i class="fas ${icons[index]}"></i></div>
                        <span class="progress-label">${step}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
};

const renderOrderDetailsPage = () => {
    const container = document.getElementById('order-details-view-container');
    const progressBarContainer = document.getElementById('checkout-progress-bar-container');
    if (!container || !progressBarContainer) return;

    if (!state.userDetails) {
        showNotification("Please complete your profile to proceed.", "error");
        showProfileView('edit');
        document.getElementById('profile-page-modal').classList.remove('hidden');
        return;
    }

    progressBarContainer.innerHTML = createCheckoutProgressBar(1);

    const { firstName, lastName, mobile, street, city, pincode, carBrandModel } = state.userDetails;
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    container.innerHTML = `
        <div class="order-details-grid">
            <div class="details-card">
                <h4>Shipping Address</h4>
                <div class="user-info-item">
                    <i class="fas fa-user"></i>
                    <span>${firstName || ''} ${lastName || ''}</span>
                </div>
                <div class="user-info-item">
                    <i class="fas fa-phone"></i>
                    <span>+91 ${(mobile || '').replace(/^91/, '')}</span>
                </div>
                <div class="user-info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${street || ''}, ${city || ''}, ${pincode || ''}</span>
                </div>
                 <div class="user-info-item">
                    <i class="fas fa-car"></i>
                    <span>${carBrandModel || 'No car selected'}</span>
                </div>
                <button id="edit-details-btn" class="text-btn">Edit Details</button>
            </div>
            <div class="order-summary-card">
                <h4>Order Summary</h4>
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>₹${subtotal.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Tax (18%)</span>
                    <span>₹${tax.toFixed(2)}</span>
                </div>
                <div class="summary-row total">
                    <span>Total</span>
                    <span>₹${total.toFixed(2)}</span>
                </div>
            </div>
        </div>
        <button id="proceed-to-payment-btn" class="checkout-btn">Proceed to Payment</button>
    `;

    document.getElementById('edit-details-btn')?.addEventListener('click', () => {
        showProfileView('edit');
        document.getElementById('profile-page-modal').classList.remove('hidden');
    });
    
    document.getElementById('proceed-to-payment-btn')?.addEventListener('click', () => {
        // Validate that all required user details are filled
        if (!firstName || !street || !city || !pincode) {
             showNotification("Please complete your name and address in your profile before proceeding.", "error");
             showProfileView('edit');
             document.getElementById('profile-page-modal').classList.remove('hidden');
        } else {
            window.navigate('/payment-method');
        }
    });
};

const renderPaymentMethodPage = () => {
    const container = document.getElementById('payment-method-view-container');
    const progressBarContainer = document.getElementById('checkout-progress-bar-container-payment');
    if (!container || !progressBarContainer) return;

    progressBarContainer.innerHTML = createCheckoutProgressBar(2);
    
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    container.innerHTML = `
        <div class="payment-layout">
            <div class="payment-options">
                <h4>Choose a payment option</h4>
                <div class="payment-option">
                    <input type="radio" id="pay-cod" name="payment-method" value="COD" checked>
                    <label for="pay-cod">
                        <i class="fas fa-money-bill-wave"></i>
                        <span>Cash on Delivery (COD)</span>
                    </label>
                </div>
                 <div class="payment-option">
                    <input type="radio" id="pay-upi" name="payment-method" value="UPI">
                    <label for="pay-upi">
                        <i class="fas fa-qrcode"></i>
                        <span>UPI / QR Code</span>
                    </label>
                </div>
            </div>
            <div class="summary-card">
                 <h4>Order Summary</h4>
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>₹${subtotal.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Tax (18%)</span>
                    <span>₹${tax.toFixed(2)}</span>
                </div>
                <div class="summary-row total">
                    <span>Total</span>
                    <span>₹${total.toFixed(2)}</span>
                </div>
            </div>
        </div>
        <button id="confirm-order-btn" class="checkout-btn">Confirm Order</button>
    `;
    
    document.getElementById('confirm-order-btn')?.addEventListener('click', async (e) => {
        const button = e.target;
        setButtonLoadingState(button, true);

        const selectedPaymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
        state.setCurrentOrderPaymentMethod(selectedPaymentMethod);
        
        const newOrder = {
            orderId: Date.now().toString(),
            userId: state.userDetails.mobile,
            userName: `${state.userDetails.firstName} ${state.userDetails.lastName}`.trim(),
            orderDate: new Date().toISOString(),
            itemsJson: JSON.stringify(state.cart),
            totalAmount: total,
            paymentMethod: selectedPaymentMethod,
            status: 'Placed',
            shippingAddress: `${state.userDetails.street}, ${state.userDetails.city}, ${state.userDetails.pincode}`,
            serviceTypes: [...new Set(state.cart.map(item => {
                const service = state.services.find(s => s.id === item.id);
                return service ? service.segment : 'Unknown';
            }))].join(', ')
        };

        const savedOrder = await api.saveNewOrder(newOrder);

        if (savedOrder) {
            state.userOrders.push(savedOrder);
            state.setCart([]);
            updateCartCountBadge();
            window.navigate('/order-confirmation');
        } else {
             showNotification('Failed to place order. Please try again.', 'error');
        }
        
        setButtonLoadingState(button, false);
    });
};

const renderOrderConfirmationPage = () => {
    const container = document.getElementById('order-confirmation-view-container');
    const progressBarContainer = document.getElementById('checkout-progress-bar-container-confirmation');
    if (!container || !progressBarContainer) return;

    progressBarContainer.innerHTML = createCheckoutProgressBar(3);
    
    const latestOrder = [...state.userOrders].sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))[0];
    if (!latestOrder) {
        window.navigate('/home'); // Should not happen
        return;
    }
    
    const items = typeof latestOrder.itemsJson === 'string' ? JSON.parse(latestOrder.itemsJson) : latestOrder.itemsJson;
    
    container.innerHTML = `
        <div class="order-confirmation-view">
            <i class="fas fa-check-circle success-icon"></i>
            <h2>Order Placed Successfully!</h2>
            <p>Thank you for your purchase. Your order ID is <strong>#${latestOrder.orderId}</strong>. We'll be in touch shortly.</p>
            
            <div class="confirmation-summary">
                <div class="review-submission-section">
                    <h4>Tell us how we did!</h4>
                    ${items.map(item => `
                    <div class="review-submission-item">
                        <span>${item.name}</span>
                        <button class="review-order-item-btn text-btn" data-service-id="${item.id}">Leave a Review <i class="fas fa-star"></i></button>
                    </div>
                    `).join('')}
                </div>
            </div>
            
            <a href="/my-orders-list" class="btn">View My Orders</a>
        </div>
    `;
};

// ... (rest of the file as needed)

export const openBookingModal = (serviceId, isBuyNow = false) => {
    state.setCurrentBookingServiceId(serviceId);
    state.setCurrentBookingIsBuyNow(isBuyNow);

    const modal = document.getElementById('booking-modal');
    const body = document.getElementById('booking-modal-body');
    if (!modal || !body) return;

    const generateDateChips = () => {
        let chips = '';
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const day = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = date.getDate();
            chips += `<button class="date-chip-btn" data-date="${date.toISOString().split('T')[0]}">
                          <span class="day">${day}</span>
                          <span class="date">${dayNum}</span>
                      </button>`;
        }
        return chips;
    };

    body.innerHTML = `
        <div class="form-group">
            <h4>Select Date</h4>
            <div class="date-chips">${generateDateChips()}</div>
        </div>
        <div class="form-group">
            <h4>Select Time Slot</h4>
            <div id="booking-time-slots" class="hidden">
                 <p class="no-data-message">Please select a date to see available time slots.</p>
            </div>
        </div>
        <button id="confirm-booking-btn" class="auth-btn" disabled>Confirm Slot</button>
    `;

    const dateChips = body.querySelectorAll('.date-chip-btn');
    const timeSlotsContainer = body.querySelector('#booking-time-slots');
    const confirmBtn = body.querySelector('#confirm-booking-btn');

    dateChips.forEach(chip => {
        chip.addEventListener('click', () => {
            dateChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.setCurrentBookingSelection({ ...state.currentBookingSelection, date: chip.dataset.date, time: null });
            
            // Dummy time slots for now
            const slots = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM'];
            timeSlotsContainer.innerHTML = slots.map(slot => `<button class="time-slot-btn">${slot}</button>`).join('');
            timeSlotsContainer.classList.remove('hidden');

            timeSlotsContainer.querySelectorAll('.time-slot-btn').forEach(slotBtn => {
                slotBtn.addEventListener('click', () => {
                    timeSlotsContainer.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('active'));
                    slotBtn.classList.add('active');
                    state.setCurrentBookingSelection({ ...state.currentBookingSelection, time: slotBtn.textContent });
                    confirmBtn.disabled = false;
                });
            });
             confirmBtn.disabled = true;
        });
    });

    confirmBtn.addEventListener('click', () => {
        const { date, time } = state.currentBookingSelection;
        if (date && time) {
            const added = addToCart(state.currentBookingServiceId, { date, time });
            if (added && state.currentBookingIsBuyNow) {
                window.navigate('/my-order');
            }
            modal.classList.add('hidden');
        } else {
            showNotification('Please select a date and time.', 'error');
        }
    });
    
    modal.querySelector('.booking-modal-close-btn')?.addEventListener('click', () => modal.classList.add('hidden'));

    modal.classList.remove('hidden');
};

export const openReviewModal = (serviceId) => {
    state.setCurrentReviewServiceId(serviceId);
    
    const modal = document.getElementById('review-modal');
    if (!modal) return;
    
    // Reset form state
    document.getElementById('review-form').reset();
    document.getElementById('review-rating-value').value = '0';
    modal.querySelectorAll('.interactive-star-rating i').forEach(star => star.className = 'far fa-star');

    const service = state.services.find(s => s.id === serviceId);
    document.getElementById('review-modal-title').textContent = `Review: ${service ? service.title : 'Service'}`;
    
    modal.classList.remove('hidden');

    const starContainer = modal.querySelector('#review-star-rating-input');
    const stars = starContainer.querySelectorAll('i');
    const ratingInput = document.getElementById('review-rating-value');

    const setRating = (rating) => {
        ratingInput.value = rating;
        stars.forEach(star => {
            star.className = star.dataset.rating <= rating ? 'fas fa-star' : 'far fa-star';
        });
    };

    starContainer.addEventListener('click', e => {
        if (e.target.tagName === 'I' && e.target.dataset.rating) {
            setRating(e.target.dataset.rating);
        }
    });

    const form = document.getElementById('review-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const button = e.target.querySelector('button[type="submit"]');
        setButtonLoadingState(button, true);

        const review = {
            serviceId: state.currentReviewServiceId,
            rating: parseInt(ratingInput.value, 10),
            comment: document.getElementById('review-comment-input').value,
        };

        if (review.rating === 0) {
            showNotification('Please select a star rating.', 'error');
            setButtonLoadingState(button, false);
            return;
        }

        const success = await api.saveReview(review);
        if (success) {
            showNotification('Thank you for your review!', 'success');
            modal.classList.add('hidden');
            // Refresh data to show new review
            await api.fetchAllData(false);
            renderAllPages();
            
            // If on an order page, re-render it
            if (window.location.pathname.includes('my-orders-list')) {
                renderMyOrdersListPage();
            }
        } else {
             showNotification('Failed to submit review. Please try again.', 'error');
        }
        
        setButtonLoadingState(button, false);
    };
};

export const openOrderDetailModal = (orderId) => {
    const modal = document.getElementById('order-details-summary-modal');
    const body = document.getElementById('order-summary-modal-body');
    if (!modal || !body) return;

    const order = state.userOrders.find(o => o.orderId === orderId);
    if (!order) {
        showNotification('Order details not found.', 'error');
        return;
    }
    
    const items = typeof order.itemsJson === 'string' ? JSON.parse(order.itemsJson) : order.itemsJson;
    const trackingHistory = order.trackingHistory || [{ status: 'Placed', timestamp: order.orderDate }];
    
    body.innerHTML = `
        <div class="order-summary-details">
            <h4>Order #${order.orderId}</h4>
            <p><strong>Date:</strong> ${new Date(order.orderDate).toLocaleString()}</p>
            <p><strong>Total:</strong> ₹${order.totalAmount.toLocaleString()}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Address:</strong> ${order.shippingAddress}</p>
            
            <h5>Items</h5>
            <ul>
                ${items.map(item => `<li>${item.name} (x${item.quantity})</li>`).join('')}
            </ul>

            <h5>Order Tracking</h5>
            <div class="order-tracking-timeline">
            ${trackingHistory.map((step, index) => `
                <div class="tracking-step ${index === trackingHistory.length - 1 ? 'active' : 'completed'}">
                    <div class="tracking-marker"><i class="fas fa-check"></i></div>
                    <div class="tracking-details">
                        <p class="tracking-status">${step.status}</p>
                        <p class="tracking-timestamp">${new Date(step.timestamp).toLocaleString()}</p>
                    </div>
                </div>
            `).join('')}
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
};


// --- Auth & Profile ---
export const openAuthModal = (isCheckout = false) => {
    state.setAuthRedirect(isCheckout);
    showAuthStep('mobile');
    document.getElementById('auth-modal')?.classList.remove('hidden');
};

export const showAuthStep = (step) => {
    document.getElementById('auth-step-mobile')?.classList.add('hidden');
    document.getElementById('auth-step-otp')?.classList.add('hidden');
    document.getElementById('auth-step-success')?.classList.add('hidden');
    
    document.getElementById(`auth-step-${step}`)?.classList.remove('hidden');
    
    if (step === 'otp') {
        const otpInputs = document.querySelectorAll('.otp-input');
        otpInputs[0]?.focus();
        
        otpInputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                if (e.key >= 0 && e.key <= 9) {
                    input.value = ''; // Clear before setting new value
                    setTimeout(() => otpInputs[index + 1]?.focus(), 10);
                } else if (e.key === 'Backspace') {
                     setTimeout(() => otpInputs[index - 1]?.focus(), 10);
                }
            });
        });
    }
};

export const updateProfileUI = () => {
    const loggedOutView = document.getElementById('logged-out-view');
    const loggedInView = document.getElementById('logged-in-view');
    const userDisplay = document.getElementById('user-display');
    const dashboardName = document.getElementById('profile-dashboard-name');
    const dashboardMobile = document.getElementById('profile-dashboard-mobile');
    const ordersCountBadge = document.getElementById('profile-orders-count');
    
    if (state.isLoggedIn && state.userDetails) {
        loggedOutView?.classList.add('hidden');
        loggedInView?.classList.remove('hidden');
        
        const userName = (state.userDetails.firstName || 'My Profile').split(' ')[0];
        if (userDisplay) userDisplay.textContent = userName;
        if (dashboardName) dashboardName.textContent = `${state.userDetails.firstName || ''} ${state.userDetails.lastName || ''}`.trim() || 'User';
        if (dashboardMobile) dashboardMobile.textContent = `+91 ${state.userDetails.mobile.replace('91', '')}`;
        
        const orderCount = state.userOrders.length;
        if(ordersCountBadge) {
            ordersCountBadge.textContent = orderCount;
            ordersCountBadge.classList.toggle('hidden', orderCount === 0);
        }

    } else {
        loggedOutView?.classList.remove('hidden');
        loggedInView?.classList.add('hidden');
    }
    updateCarSelectorDisplay();
};

export const showProfileView = (view) => {
    const dashboard = document.getElementById('profile-dashboard-view');
    const edit = document.getElementById('profile-edit-view');
    
    if (view === 'edit') {
        populateProfileForm();
        dashboard?.classList.add('hidden');
        edit?.classList.remove('hidden');
    } else { // dashboard
        updateProfileUI(); // Ensure data is fresh before showing dashboard
        dashboard?.classList.remove('hidden');
        edit?.classList.add('hidden');
    }
};

const populateProfileForm = () => {
    const form = document.getElementById('user-details-form');
    if (!form || !state.userDetails) return;
    
    form.elements['firstName'].value = state.userDetails.firstName || '';
    form.elements['lastName'].value = state.userDetails.lastName || '';
    form.elements['mobile'].value = `+91 ${state.userDetails.mobile.replace('91', '')}`;
    form.elements['carBrandModel'].value = state.userDetails.carBrandModel || '';
    form.elements['carNumber'].value = state.userDetails.carNumber || '';
    form.elements['street'].value = state.userDetails.street || '';
    form.elements['city'].value = state.userDetails.city || '';
    form.elements['pincode'].value = state.userDetails.pincode || '';
};


// --- Car Selector ---
export const updateCarSelectorDisplay = () => {
    const trigger = document.getElementById('car-selector-trigger');
    if (!trigger) return;

    const carIsSelected = state.isLoggedIn ? state.userDetails?.selectedVariant : state.guestSelectedCar?.selectedVariant;
    const selectedCar = state.isLoggedIn ? state.userDetails : state.guestSelectedCar;
    
    if (carIsSelected) {
        let modelImageUrl = '';
        if(Array.isArray(state.carDatabase)) {
            const brandData = state.carDatabase.find(b => b.name === selectedCar.selectedVariant.brand);
            if (brandData) {
                // Case-insensitive search for model key
                const modelKey = Object.keys(brandData.models).find(k => k.toLowerCase() === selectedCar.selectedVariant.model.toLowerCase());
                if (modelKey) {
                    modelImageUrl = brandData.models[modelKey]?.image || '';
                }
            }
        }
        
        trigger.innerHTML = `
            <div class="car-info">
                ${modelImageUrl ? `<img src="${modelImageUrl}" class="car-thumb" alt="${selectedCar.carBrandModel}">` : '<i class="fas fa-car-alt"></i>'}
                <span>${selectedCar.carBrandModel}</span>
            </div>
            <i class="fas fa-chevron-right"></i>
        `;
    } else {
        trigger.innerHTML = `
             <div class="car-info">
                <i class="fas fa-car-alt"></i>
                <span>Select Your Car</span>
            </div>
            <i class="fas fa-chevron-right"></i>
        `;
    }
};

export const updateCarView = () => {
    const modal = document.getElementById('car-selection-modal');
    if (!modal || !state.carDatabase) return;
    
    const { step, brand, model } = state.selectionState;
    const title = modal.querySelector('#modal-title');
    const content = modal.querySelector('#modal-step-content');
    const backBtn = modal.querySelector('#modal-back-btn');
    const searchContainer = modal.querySelector('#modal-search-container');
    const searchInput = modal.querySelector('#modal-search-input');
    
    // Update progress bar
    modal.querySelectorAll('.progress-step').forEach(el => {
        el.classList.remove('active', 'completed');
        if (el.dataset.step === step) el.classList.add('active');
        if (step === 'model' && el.dataset.step === 'brand') el.classList.add('completed');
        if (step === 'variant' && ['brand', 'model'].includes(el.dataset.step)) el.classList.add('completed');
        if (step === 'confirmation') el.classList.add('completed');
    });

    backBtn.classList.toggle('hidden', step === 'brand');
    searchContainer.classList.toggle('hidden', !['brand', 'model'].includes(step));
    if (searchInput) searchInput.value = '';
    
    const findIgnoreCase = (collection, key, value) => {
        if (!value || !Array.isArray(collection)) return undefined;
        return collection.find(item => item && item[key] && item[key].toUpperCase() === value.toUpperCase());
    };

    if (step === 'brand') {
        title.textContent = 'SELECT BRAND';
        if(searchInput) searchInput.placeholder = 'Search for brand...';
        content.innerHTML = renderCarGrid(state.carDatabase);
    } else if (step === 'model') {
        title.textContent = 'SELECT MODEL';
        if(searchInput) searchInput.placeholder = 'Search for model...';
        const brandData = findIgnoreCase(state.carDatabase, 'name', brand);
        if (brandData && brandData.models) {
            const modelsArray = Object.entries(brandData.models).map(([name, modelDetails]) => ({ name, ...modelDetails }));
            content.innerHTML = renderCarGrid(modelsArray);
        } else {
            content.innerHTML = '<p class="no-data-message">No models found for this brand.</p>';
        }
    } else if (step === 'variant') {
        title.textContent = 'SELECT VARIANT';
        const brandData = findIgnoreCase(state.carDatabase, 'name', brand);
        let modelData = null;
        if (brandData && brandData.models && model) {
            const modelKey = Object.keys(brandData.models).find(key => key.toUpperCase() === model.toUpperCase());
            if (modelKey) modelData = brandData.models[modelKey];
        }

        const variants = modelData?.variants;
        let variantsArray = [];
        if (variants) {
            if (Array.isArray(variants)) {
                variantsArray = variants;
            } else if (typeof variants === 'object') {
                variantsArray = Object.entries(variants).map(([name, details]) => ({ name, ...details }));
            }
        }
        content.innerHTML = variantsArray.length > 0 ? renderVariantList(variantsArray) : '<p class="no-data-message">No variants found.</p>';
    } else if (step === 'confirmation') {
        title.textContent = 'CONFIRM SELECTION';
        const brandData = findIgnoreCase(state.carDatabase, 'name', brand);
        let modelData = null;
        if (brandData && brandData.models && model) {
            const modelKey = Object.keys(brandData.models).find(key => key.toUpperCase() === model.toUpperCase());
            if (modelKey) modelData = brandData.models[modelKey];
        }

        let variantData = null;
        if (modelData?.variants) {
            const variants = modelData.variants;
            let variantsArray = [];
            if (Array.isArray(variants)) {
                variantsArray = variants;
            } else if (typeof variants === 'object') {
                variantsArray = Object.entries(variants).map(([name, details]) => ({ name, ...details }));
            }
            variantData = findIgnoreCase(variantsArray, 'name', state.selectionState.variant);
        }

        let finalVariantData = null;
        if (variantData) {
            finalVariantData = {
                ...variantData,
                brand: brandData.name,
                model: model, // From state.selectionState
            };
        }
        
        content.innerHTML = finalVariantData ? renderConfirmationView(finalVariantData, modelData.image) : '<p class="no-data-message">Selection could not be confirmed.</p>';
    }
    
    // Attach image loaders
    content.querySelectorAll('img[data-src]').forEach(img => setAsyncImage(img, img.dataset.src));
};

const renderCarGrid = (items) => {
    if (!items || items.length === 0) return '<p class="no-data-message">No items found.</p>';
    return `<div class="modal-step-grid">
        ${items.map(item => `
            <div class="grid-item" data-id="${item.name}">
                <div class="main-image-container">
                    <img class="car" src="" data-src="${item.image}" alt="${item.name}" loading="lazy">
                </div>
                <p>${item.name}</p>
            </div>
        `).join('')}
    </div>`;
};

const renderVariantList = (variants) => {
    return `<div class="variant-list">
        ${variants.map(v => `<div class="list-item" data-id="${v.name}">${v.name}</div>`).join('')}
    </div>`;
};

const renderConfirmationView = (variant, modelImage) => {
    return `
        <div class="confirmation-view">
            <div class="main-image-container">
                <img src="${modelImage}" alt="${variant.model}">
            </div>
            <h4>${variant.brand} ${variant.model}</h4>
            <p>${variant.name}</p>
            <div class="confirmation-details">
                <div class="detail-row"><strong>Fuel:</strong> <span>${variant.fuel}</span></div>
                <div class="detail-row"><strong>Transmission:</strong> <span>${variant.transmission}</span></div>
            </div>
            <div class="confirmation-buttons">
                <button class="change-btn" data-action="change-car-selection">Change</button>
                <button class="done-btn" data-action="confirm-car-selection">Done</button>
            </div>
        </div>
    `;
};

export const goBackCar = () => {
    const { step } = state.selectionState;
    const newSelection = { ...state.selectionState };

    if (step === 'model') newSelection.step = 'brand';
    else if (step === 'variant') newSelection.step = 'model';
    else if (step === 'confirmation') newSelection.step = 'variant';

    state.setSelectionState(newSelection);
    updateCarView();
};

export const updateCartCountBadge = () => {
    const count = state.cart.length;
    const badge = document.getElementById('cart-item-count');
    const mobileBadge = document.getElementById('mobile-order-count');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
    if (mobileBadge) {
        const loggedInOrderCount = state.isLoggedIn ? state.userOrders.length : 0;
        mobileBadge.textContent = loggedInOrderCount;
        mobileBadge.classList.toggle('hidden', loggedInOrderCount === 0);
    }
};