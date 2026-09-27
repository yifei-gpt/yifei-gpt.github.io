(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var sections = Array.prototype.slice.call(document.querySelectorAll(".content-section"));

    if (reduceMotion || !("IntersectionObserver" in window)) {
        sections.forEach(function (section) {
            section.classList.add("section-visible");
        });
    } else {
        var sectionObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add("section-visible");
                sectionObserver.unobserve(entry.target);
            });
        }, {
            threshold: 0.08,
            rootMargin: "0px 0px -8% 0px"
        });

        sections.forEach(function (section) {
            if (section.getBoundingClientRect().top < window.innerHeight * 0.92) {
                section.classList.add("section-visible");
            } else {
                section.classList.add("reveal-pending");
                sectionObserver.observe(section);
            }
        });
    }

    var flowEntries = Array.prototype.slice.call(document.querySelectorAll(".flow-entry"));
    var coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    var playFlowOnce = function (entry) {
        entry.classList.add("flow-played");
    };

    flowEntries.forEach(function (entry) {
        if (!coarsePointer) {
            entry.addEventListener("pointerenter", function () {
                entry.classList.add("is-active");
            });

            entry.addEventListener("pointerleave", function () {
                if (!entry.contains(document.activeElement)) {
                    entry.classList.remove("is-active");
                }
            });
        }

        entry.addEventListener("focusin", function () {
            entry.classList.add("is-active");
        });

        entry.addEventListener("focusout", function () {
            window.setTimeout(function () {
                if (!entry.contains(document.activeElement) && !entry.matches(":hover")) {
                    entry.classList.remove("is-active");
                }
            }, 0);
        });
    });

    if (!reduceMotion && coarsePointer && "IntersectionObserver" in window) {
        var flowObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) {
                    return;
                }

                playFlowOnce(entry.target);
                flowObserver.unobserve(entry.target);
            });
        }, {
            threshold: 0.55,
            rootMargin: "0px 0px -5% 0px"
        });

        flowEntries.forEach(function (entry) {
            flowObserver.observe(entry);
        });
    }

    var downloadStats = Array.prototype.slice.call(document.querySelectorAll("[data-hf-dataset]"));
    var downloadRefreshMs = 6 * 60 * 60 * 1000;

    var formatDownloadCount = function (count) {
        return new Intl.NumberFormat("en-US").format(count);
    };

    var refreshDownloadStat = function (stat) {
        var repoId = stat.getAttribute("data-hf-dataset");
        var countNode = stat.querySelector("[data-download-count]");

        if (!repoId || !countNode || !("fetch" in window)) {
            return;
        }

        var repoPath = repoId.split("/").map(function (part) {
            return encodeURIComponent(part);
        }).join("/");
        var apiUrl = "https://huggingface.co/api/datasets/" + repoPath + "?expand=downloadsAllTime";

        window.fetch(apiUrl, {
            cache: "no-store",
            credentials: "omit",
            mode: "cors"
        }).then(function (response) {
            if (!response.ok) {
                throw new Error("Unable to load Hugging Face download statistics");
            }
            return response.json();
        }).then(function (data) {
            var count = Number(data.downloadsAllTime);
            if (!Number.isFinite(count) || count < 0) {
                throw new Error("Invalid Hugging Face download statistics");
            }

            var formattedCount = formatDownloadCount(count);
            countNode.textContent = formattedCount;
            stat.setAttribute("aria-label", formattedCount + " all-time dataset downloads on Hugging Face");
            stat.setAttribute("data-downloads-status", "live");
        }).catch(function () {
            stat.setAttribute("data-downloads-status", "fallback");
        });
    };

    downloadStats.forEach(function (stat) {
        refreshDownloadStat(stat);
        window.setInterval(function () {
            refreshDownloadStat(stat);
        }, downloadRefreshMs);
    });
}());
