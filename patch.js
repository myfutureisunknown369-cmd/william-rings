// إصلاح البحث في William - Wikipedia
(function() {
    function activate() {
        if (typeof WilliamCore === 'undefined') {
            setTimeout(activate, 500);
            return;
        }
        WilliamCore.prototype.search = async function(query) {
            try {
                const url = 'https://ar.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(query);
                const r = await fetch(url);
                if (!r.ok) return null;
                const data = await r.json();
                if (data.extract) {
                    return [{ title: data.title || query, text: data.extract }];
                }
            } catch(e) {}
            return null;
        };
        console.log('✅ William: Wikipedia search activated');
    }
    activate();
})();
