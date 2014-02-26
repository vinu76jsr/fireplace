define('views/app',
    ['capabilities', 'content-ratings', 'l10n', 'log', 'settings', 'tracking', 'utils', 'z', 'overflow'],
    function(caps, iarc, l10n, log, settings, tracking, utils, z) {
    'use strict';

    var gettext = l10n.gettext;
    var console = log('app');

    z.page.on('click', '#product-rating-status .toggle', utils._pd(function() {
        // Show/hide scary content-rating disclaimers to developers.
        $(this).closest('.toggle').siblings('div').toggleClass('hidden');

    })).on('click', '.show-toggle', utils._pd(function() {
        var $this = $(this),
            newTxt = $this.attr('data-toggle-text');
        // Toggle "more..." or "less..." text.
        $this.attr('data-toggle-text', $this.text());
        $this.text(newTxt);
        // Toggle description.
        $this.prev('.truncated-wrapper').toggleClass('truncated');

        tracking.trackEvent('App view interactions', 'click', 'Toggle description');

    })).on('click', '.approval-pitch', utils._pd(function() {
        $('#preapproval-shortcut').trigger('submit');

    })).on('click', '.product-details .icon', utils._pd(function(e) {
        // When I click on the icon, append `#id=<id>` to the URL.
        window.location.hash = 'id=' + $('.product').data('id');
        e.stopPropagation();
    }));

    if (tracking.actions_enabled) {
        z.page.on('click', '.detail .support li a.button', function(e) {
            tracking.trackEvent(
                'App view interaction',
                'click',
                this.parentNode.getAttribute('data-tracking')
            );
        });
    }

    // Init desktop abuse form modal trigger.
    // The modal is responsive even if this handler isn't removed.
    z.page.on('click', '.abuse .button', function(e) {
        if (caps.widescreen()) {
            e.preventDefault();
            e.stopPropagation();
            z.body.trigger('decloak');
            $('.report-abuse.modal').addClass('show');
        }
    });

    return function(builder, args) {
        var slug = args[0];
        builder.start('detail/main.html', {
            iarc: iarc,
            slug: slug
        });

        // This is fine; tracking_helpers depends on:
        // navigation > views > views/app
        // This prevents a dependency loop, but all deps should have been
        // resolved by the time this executes.
        require('tracking_helpers').track_search_term(true);

        builder.z('type', 'leaf detail');
        builder.z('title', gettext('Loading...'));
        builder.z('pagetitle', gettext('App Details'));

        var sync = true;
        builder.onload('app-data', function(app) {
            builder.z('title', utils.translate(app.name));

            z.page.trigger('populatetray');
            require('overflow').init();

            // 'truncated' class is applied by default, remove it if it's not
            // needed.
            $('.truncated-wrapper').each(function() {
                var $this = $(this);
                if ($this.prop('scrollHeight') <= $this.prop('offsetHeight')) {
                    $this.removeClass('truncated').next('.show-toggle').hide();
                }
            });
            if (caps.widescreen() && !$('.report-abuse').length) {
                z.page.append(
                    require('templates').env.render('detail/abuse.html', {slug: slug})
                );
            }

            if (!sync) return;

            if (app) {
                tracking.setPageVar(6, 'App name', app.name, 3);
                tracking.setPageVar(7, 'App ID', app.id + '', 3);
                tracking.setPageVar(8, 'App developer', app.author, 3);
                tracking.setPageVar(9, 'App view source', utils.getVars().src || 'direct', 3);
                tracking.setPageVar(10, 'App price', app.payment_required ? 'paid' : 'free', 3);
            } else {
                console.warn('app object is falsey and is not being tracked');
            }

        }).onload('ratings', function() {
            var reviews = $('.detail .reviews li');
            if (reviews.length >= 3) {
                for (var i = 0; i < reviews.length - 2; i += 2) {
                    var hgt = Math.max(reviews.eq(i).find('.review-inner').height(),
                                       reviews.eq(i + 1).find('.review-inner').height());
                    reviews.eq(i).find('.review-inner').height(hgt);
                    reviews.eq(i + 1).find('.review-inner').height(hgt);
                }
            }
        });
        sync = false;
    };
});
