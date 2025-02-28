/**
 * Fava's main Javascript entry point.
 *
 * The code for Fava's UI is split into several modules that are all imported
 * below. The different modules can listen to and register events to
 * communicate and to register DOM event handlers for example.
 *
 * The events currently in use in Fava:
 *
 * file-modified:
 *    Fetch and update the error count in the sidebar.
 *
 * page-init:
 *    Run once the page is initialized, i.e., when the DOM is ready. Use this
 *    for JS code and parts of the UI that are independent of the current
 *    contents of <article>.
 *
 * page-loaded:
 *    After a new page has been loaded asynchronously. Use this to bind to
 *    elements in the page.
 */

import { $, _, delegate, ready, fetchAPI } from "./helpers";
import e from "./events";
import router from "./router";

import "../css/style.css";
import "../css/base.css";
import "../css/charts.css";
import "../css/components.css";
import "../css/editor.css";
import "../css/entry-forms.css";
import "../css/fonts.css";
import "../css/header.css";
import "../css/help.css";
import "../css/journal-table.css";
import "../css/media-mobile.css";
import "../css/media-print.css";
import "../css/overlay.css";
import "../css/query.css";
import "../css/tree-table.css";
import "codemirror/lib/codemirror.css";
import "codemirror/addon/dialog/dialog.css";
import "codemirror/addon/fold/foldgutter.css";
import "codemirror/addon/hint/show-hint.css";

import "./autocomplete";
import "./charts";
import "./clipboard";
import "./editor";
import "./journal";
import "./keyboard-shortcuts";
import { notify } from "./notifications";
import "./sidebar";
import "./sort";
import "./tree-table";
import { favaAPI } from "./stores";

import Import from "./Import.svelte";
import ChartSwitcher from "./ChartSwitcher.svelte";
import FilterForm from "./FilterForm.svelte";
import Modals from "./modals/Modals.svelte";

function initSvelteComponent(selector, SvelteComponent) {
  const el = $(selector);
  if (el) {
    let data = {};
    if (el.firstChild && el.firstChild.type === "application/json") {
      data = JSON.parse(el.firstChild.innerHTML);
    }
    const component = new SvelteComponent({ target: el, props: { data } });
    e.once("page-loaded", () => component.$destroy());
  }
}

e.on("page-loaded", () => {
  Object.assign(favaAPI, JSON.parse($("#ledger-data").innerHTML));

  initSvelteComponent("#svelte-charts", ChartSwitcher);
  initSvelteComponent("#svelte-import", Import);

  document.title = $("#data-document-title").value;
  $("h1 strong").innerHTML = $("#data-page-title").innerHTML;
  $("#reload-page").classList.add("hidden");
});

e.on("page-init", () => {
  // eslint-disable-next-line
  new Modals({ target: document.body });
  // eslint-disable-next-line
  new FilterForm({ target: $("header") });

  // Watch for all clicks on <button>s and fire the appropriate events.
  delegate(document.body, "click", "button", event => {
    const button = event.target.closest("button");
    const type = button.getAttribute("data-event");
    if (type) {
      e.trigger(`button-click-${type}`, button);
    }
  });

  // Watch for all submits of <forms>s and fire the appropriate events.
  delegate(document.body, "submit", "form", event => {
    const form = event.target;
    const type = form.getAttribute("data-event");
    if (type) {
      event.preventDefault();
      e.trigger(`form-submit-${type}`, form);
    }
  });
});

// Check the `changed` API endpoint every 5 seconds and fire the appropriate
// events if some file changed.
async function doPoll() {
  try {
    const changed = await fetchAPI("changed");
    if (changed) {
      if (favaAPI.favaOptions["auto-reload"]) {
        router.reload();
      } else {
        $("#reload-page").classList.remove("hidden");
        e.trigger("file-modified");
        notify(_("File change detected. Click to reload."), "warning", () => {
          router.reload();
        });
      }
    }
  } finally {
    setTimeout(doPoll, 5000);
  }
}

ready().then(() => {
  Object.assign(favaAPI, JSON.parse($("#ledger-data").innerHTML));
  router.init();
  e.trigger("page-init");
  e.trigger("page-loaded");
  setTimeout(doPoll, 5000);
});
