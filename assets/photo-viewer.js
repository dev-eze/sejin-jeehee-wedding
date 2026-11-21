(function () {
    'use strict';
    var gallery = document.getElementById('photoScroll');
    if (!gallery) return;
    var photos = Array.from(gallery.querySelectorAll('.photo_image img'));
    if (!photos.length) return;
    var dialog = document.createElement('dialog');
    dialog.className = 'photo_view';
    dialog.setAttribute('aria-labelledby', 'photoViewTitle');
    dialog.setAttribute('aria-describedby', 'photoViewHint');
    var icons = {
        close: '<path d="m6 6 12 12M18 6 6 18"/>',
        prev: '<path d="m15 5-7 7 7 7"/>',
        next: '<path d="m9 5 7 7-7 7"/>',
        minus: '<path d="M5 12h14"/>',
        plus: '<path d="M5 12h14M12 5v14"/>'
    };
    function icon(name) {
        return '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>';
    }
    dialog.innerHTML = '<header class="photo_view_header"><h2 class="photo_view_title" id="photoViewTitle">Our moments</h2>' +
        '<button type="button" data-view="close" aria-label="사진 닫기">' + icon('close') + '</button></header>' +
        '<div class="photo_view_stage"><img class="photo_view_image" alt="" draggable="false" hidden>' +
        '<p class="photo_view_message" role="status" aria-live="polite"></p></div>' +
        '<div class="photo_view_controls" role="group" aria-label="사진 확대와 이동">' +
        '<button type="button" class="photo_view_step" data-view="prev" aria-label="이전 사진">' + icon('prev') + '</button>' +
        '<button type="button" data-view="minus" aria-label="사진 축소">' + icon('minus') + '</button>' +
        '<button type="button" class="photo_view_reset" data-view="reset" aria-label="사진 원래 크기로">100%</button>' +
        '<button type="button" data-view="plus" aria-label="사진 확대">' + icon('plus') + '</button>' +
        '<button type="button" class="photo_view_step" data-view="next" aria-label="다음 사진">' + icon('next') + '</button></div>' +
        '<p class="photo_view_hint" id="photoViewHint">두 손가락으로 확대하거나 두 번 눌러 보세요.<br>확대한 사진은 끌어서 볼 수 있어요.</p>';
    document.body.appendChild(dialog);
    var stage = dialog.querySelector('.photo_view_stage');
    var image = dialog.querySelector('.photo_view_image');
    var message = dialog.querySelector('.photo_view_message');
    var buttons = {};
    dialog.querySelectorAll('[data-view]').forEach(function (button) {
        buttons[button.dataset.view] = button;
    });
    var index = 0, scale = 1, x = 0, y = 0, width = 0, height = 0;
    var savedOverflow = '', trigger = null, request = 0;
    var pointers = new Map(), gesture = null, press = null, lastTap = null, hadPinch = false, lastTouch = -Infinity;
    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
    function resetPointers() {
        pointers.clear();
        gesture = null;
        press = null;
        hadPinch = false;
        lastTap = null;
        stage.classList.remove('is_panning');
    }
    function render() {
        var maxX = Math.max(0, (width * scale - stage.clientWidth) / 2);
        var maxY = Math.max(0, (height * scale - stage.clientHeight) / 2);
        x = clamp(x, -maxX, maxX);
        y = clamp(y, -maxY, maxY);
        image.style.transform = 'translate(-50%,-50%) translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
        stage.classList.toggle('is_zoomed', scale > 1.01);
        buttons.reset.textContent = Math.round(scale * 100) + '%';
        buttons.minus.disabled = scale <= 1;
        buttons.plus.disabled = scale >= 4;
        buttons.prev.disabled = index === 0;
        buttons.next.disabled = index === photos.length - 1;
    }
    function fit() {
        if (!dialog.open || !image.naturalWidth || image.hidden) return;
        var ratio = Math.min(stage.clientWidth / image.naturalWidth, stage.clientHeight / image.naturalHeight);
        width = image.naturalWidth * ratio;
        height = image.naturalHeight * ratio;
        image.style.width = width + 'px';
        image.style.height = height + 'px';
        render();
    }
    function zoom(next, clientX, clientY) {
        var rect = stage.getBoundingClientRect();
        var pointX = clientX === undefined ? 0 : clientX - rect.left - rect.width / 2;
        var pointY = clientY === undefined ? 0 : clientY - rect.top - rect.height / 2;
        next = clamp(next, 1, 4);
        var ratio = next / scale;
        x = pointX - (pointX - x) * ratio;
        y = pointY - (pointY - y) * ratio;
        scale = next;
        render();
    }
    function show(next) {
        index = clamp(next, 0, photos.length - 1);
        resetPointers();
        scale = 1; x = 0; y = 0; width = 0; height = 0;
        var original = photos[index], token = ++request;
        image.hidden = true;
        image.alt = original.alt;
        image.style.filter = getComputedStyle(original).filter;
        message.textContent = '사진을 불러오고 있어요.';
        stage.setAttribute('aria-busy', 'true');
        function ready() {
            if (token !== request) return;
            image.hidden = false;
            stage.removeAttribute('aria-busy');
            message.textContent = '';
            fit();
        }
        image.onload = ready;
        image.onerror = function () {
            if (token !== request) return;
            stage.removeAttribute('aria-busy');
            message.textContent = '사진을 불러오지 못했어요. 다른 사진을 보거나 다시 열어 주세요.';
        };
        image.src = original.currentSrc || original.src;
        if (image.complete && image.naturalWidth) ready();
        render();
    }
    gallery.addEventListener('click', function (event) {
        var button = event.target.closest('.photo_open');
        if (!button || event.defaultPrevented) return;
        var original = button.parentElement.querySelector('img');
        index = photos.indexOf(original);
        if (index < 0) return;
        trigger = button;
        savedOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        dialog.showModal();
        show(index);
        buttons.close.focus({ preventScroll: true });
    });
    dialog.addEventListener('close', function () {
        request++;
        resetPointers();
        document.documentElement.style.overflow = savedOverflow;
        if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
    });
    buttons.close.addEventListener('click', function () { dialog.close(); });
    buttons.prev.addEventListener('click', function () { show(index - 1); });
    buttons.next.addEventListener('click', function () { show(index + 1); });
    buttons.minus.addEventListener('click', function () { zoom(scale - .5); });
    buttons.plus.addEventListener('click', function () { zoom(scale + .5); });
    buttons.reset.addEventListener('click', function () { zoom(1); });
    dialog.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowLeft') show(index - 1);
        else if (event.key === 'ArrowRight') show(index + 1);
        else if (event.key === '+' || event.key === '=') zoom(scale + .5);
        else if (event.key === '-') zoom(scale - .5);
        else if (event.key === '0') zoom(1);
        else return;
        event.preventDefault();
    });
    stage.addEventListener('dblclick', function (event) {
        event.preventDefault();
        if (performance.now() - lastTouch < 600) return;
        zoom(scale > 1 ? 1 : 2.5, event.clientX, event.clientY);
    });
    stage.addEventListener('wheel', function (event) {
        event.preventDefault();
        zoom(scale * Math.exp(-event.deltaY * .002), event.clientX, event.clientY);
    }, { passive: false });
    function beginGesture() {
        var points = Array.from(pointers.values());
        if (points.length >= 2) {
            hadPinch = true;
            lastTap = null;
            var a = points[0], b = points[1];
            gesture = { distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
                midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2, scale: scale, x: x, y: y };
        } else if (points.length === 1) {
            gesture = { startX: points[0].x, startY: points[0].y, x: x, y: y };
        } else gesture = null;
    }
    stage.addEventListener('pointerdown', function (event) {
        if ((event.pointerType === 'mouse' && event.button !== 0) || image.hidden) return;
        if (event.pointerType === 'touch') lastTouch = performance.now();
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        stage.setPointerCapture(event.pointerId);
        if (pointers.size === 1) {
            press = { x: event.clientX, y: event.clientY, time: performance.now(), moved: false };
            hadPinch = false;
        }
        stage.classList.add('is_panning');
        beginGesture();
    });
    stage.addEventListener('pointermove', function (event) {
        if (!pointers.has(event.pointerId) || !gesture) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) press.moved = true;
        var points = Array.from(pointers.values());
        if (points.length >= 2 && gesture.distance) {
            var a = points[0], b = points[1], rect = stage.getBoundingClientRect();
            scale = clamp(gesture.scale * Math.hypot(b.x - a.x, b.y - a.y) / gesture.distance, 1, 4);
            var ratio = scale / gesture.scale;
            x = (a.x + b.x) / 2 - rect.left - rect.width / 2 - (gesture.midX - rect.left - rect.width / 2 - gesture.x) * ratio;
            y = (a.y + b.y) / 2 - rect.top - rect.height / 2 - (gesture.midY - rect.top - rect.height / 2 - gesture.y) * ratio;
        } else if (points.length === 1 && gesture.startX !== undefined) {
            x = gesture.x + event.clientX - gesture.startX;
            y = gesture.y + event.clientY - gesture.startY;
        }
        render();
    });
    function endPointer(event) {
        if (!pointers.has(event.pointerId)) return;
        var finalPointer = pointers.size === 1;
        var dx = press ? event.clientX - press.x : 0, dy = press ? event.clientY - press.y : 0;
        if (event.type === 'pointerup' && finalPointer && press && !hadPinch) {
            if (scale === 1 && Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                show(index + (dx < 0 ? 1 : -1));
                return;
            }
            if (event.pointerType === 'touch' && !press.moved && performance.now() - press.time < 350) {
                if (lastTap && performance.now() - lastTap.time < 320 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 28) {
                    zoom(scale > 1 ? 1 : 2.5, event.clientX, event.clientY);
                    lastTap = null;
                } else lastTap = { time: performance.now(), x: event.clientX, y: event.clientY };
            }
        }
        pointers.delete(event.pointerId);
        beginGesture();
        if (!pointers.size) { press = null; stage.classList.remove('is_panning'); }
    }
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
    stage.addEventListener('lostpointercapture', endPointer);
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(stage);
    else window.addEventListener('resize', fit);
})();
