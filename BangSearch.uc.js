// ==UserScript==
// @name           Letter Tabs Site Shortcuts
// @include        chrome://browser/content/browser.xhtml
// ==/UserScript==
(() => {
  window.__letterTabsBangs?.destroy();
  // Embedded brand assets: official favicons; OpenAI/Genius via Simple Icons (CC0).
  const icons = {"gpt": "data:image/svg+xml;base64,PHN2ZyByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+T3BlbkFJPC90aXRsZT48cGF0aCBkPSJNMjIuMjgxOSA5LjgyMTFhNS45ODQ3IDUuOTg0NyAwIDAgMC0uNTE1Ny00LjkxMDggNi4wNDYyIDYuMDQ2MiAwIDAgMC02LjUwOTgtMi45QTYuMDY1MSA2LjA2NTEgMCAwIDAgNC45ODA3IDQuMTgxOGE1Ljk4NDcgNS45ODQ3IDAgMCAwLTMuOTk3NyAyLjkgNi4wNDYyIDYuMDQ2MiAwIDAgMCAuNzQyNyA3LjA5NjYgNS45OCA1Ljk4IDAgMCAwIC41MTEgNC45MTA3IDYuMDUxIDYuMDUxIDAgMCAwIDYuNTE0NiAyLjkwMDFBNS45ODQ3IDUuOTg0NyAwIDAgMCAxMy4yNTk5IDI0YTYuMDU1NyA2LjA1NTcgMCAwIDAgNS43NzE4LTQuMjA1OCA1Ljk4OTQgNS45ODk0IDAgMCAwIDMuOTk3Ny0yLjkwMDEgNi4wNTU3IDYuMDU1NyAwIDAgMC0uNzQ3NS03LjA3Mjl6bS05LjAyMiAxMi42MDgxYTQuNDc1NSA0LjQ3NTUgMCAwIDEtMi44NzY0LTEuMDQwOGwuMTQxOS0uMDgwNCA0Ljc3ODMtMi43NTgyYS43OTQ4Ljc5NDggMCAwIDAgLjM5MjctLjY4MTN2LTYuNzM2OWwyLjAyIDEuMTY4NmEuMDcxLjA3MSAwIDAgMSAuMDM4LjA1MnY1LjU4MjZhNC41MDQgNC41MDQgMCAwIDEtNC40OTQ1IDQuNDk0NHptLTkuNjYwNy00LjEyNTRhNC40NzA4IDQuNDcwOCAwIDAgMS0uNTM0Ni0zLjAxMzdsLjE0Mi4wODUyIDQuNzgzIDIuNzU4MmEuNzcxMi43NzEyIDAgMCAwIC43ODA2IDBsNS44NDI4LTMuMzY4NXYyLjMzMjRhLjA4MDQuMDgwNCAwIDAgMS0uMDMzMi4wNjE1TDkuNzQgMTkuOTUwMmE0LjQ5OTIgNC40OTkyIDAgMCAxLTYuMTQwOC0xLjY0NjR6TTIuMzQwOCA3Ljg5NTZhNC40ODUgNC40ODUgMCAwIDEgMi4zNjU1LTEuOTcyOFYxMS42YS43NjY0Ljc2NjQgMCAwIDAgLjM4NzkuNjc2NWw1LjgxNDQgMy4zNTQzLTIuMDIwMSAxLjE2ODVhLjA3NTcuMDc1NyAwIDAgMS0uMDcxIDBsLTQuODMwMy0yLjc4NjVBNC41MDQgNC41MDQgMCAwIDEgMi4zNDA4IDcuODcyem0xNi41OTYzIDMuODU1OEwxMy4xMDM4IDguMzY0IDE1LjExOTIgNy4yYS4wNzU3LjA3NTcgMCAwIDEgLjA3MSAwbDQuODMwMyAyLjc5MTNhNC40OTQ0IDQuNDk0NCAwIDAgMS0uNjc2NSA4LjEwNDJ2LTUuNjc3MmEuNzkuNzkgMCAwIDAtLjQwNy0uNjY3em0yLjAxMDctMy4wMjMxbC0uMTQyLS4wODUyLTQuNzczNS0yLjc4MThhLjc3NTkuNzc1OSAwIDAgMC0uNzg1NCAwTDkuNDA5IDkuMjI5N1Y2Ljg5NzRhLjA2NjIuMDY2MiAwIDAgMSAuMDI4NC0uMDYxNWw0LjgzMDMtMi43ODY2YTQuNDk5MiA0LjQ5OTIgMCAwIDEgNi42ODAyIDQuNjZ6TTguMzA2NSAxMi44NjNsLTIuMDItMS4xNjM4YS4wODA0LjA4MDQgMCAwIDEtLjAzOC0uMDU2N1Y2LjA3NDJhNC40OTkyIDQuNDk5MiAwIDAgMSA3LjM3NTctMy40NTM3bC0uMTQyLjA4MDVMOC43MDQgNS40NTlhLjc5NDguNzk0OCAwIDAgMC0uMzkyNy42ODEzem0xLjA5NzYtMi4zNjU0bDIuNjAyLTEuNDk5OCAyLjYwNjkgMS40OTk4djIuOTk5NGwtMi41OTc0IDEuNDk5Ny0yLjYwNjctMS40OTk3WiIvPjwvc3ZnPg==", "per": "data:image/x-icon;base64,AAABAAMAMDAAAAEAIACoJQAANgAAACAgAAABACAAqBAAAN4lAAAQEAAAAQAgAGgEAACGNgAAKAAAADAAAABgAAAAAQAgAAAAAAAAJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAApwAAAOgAAAD5AAAA/gAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP4AAAD5AAAA6AAAAKUAAAArAAAAAAAAACsAAADHAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAADHAAAALAAAAKUAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAApgAAAOYAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA5wAAAPkAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8CAgL/CgoK/woKCv8CAgL/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA+QAAAP4AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/DA0N/wUFBf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8nJyf/tLa2/7S2tv8nJyf/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/BQUF/w0ODv8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/gAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/WFlZ/3Bycv8HBwf/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8zNDT/7vDw/+7w8P80NDT/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8HBwf/cHJy/1xdXf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/aGlp//P29v+Ehob/DQ0N/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8zMzP/6u3t/+vt7f8zMzP/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/w0NDf+DhYX/8/b2/21ubv8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/Z2ho//v+/v/3+vr/mZub/xYWFv8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8zMzP/6u3t/+vt7f8zMzP/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/FRUV/5iamv/3+fn//P///2ttbf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAA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Av9JSkr/1NbW/25vb/8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP4AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/OTo6/zAxMf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8jJCT/pKam/6Smpv8jJCT/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/MDEx/zo6Ov8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/gAAAPkAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AQEB/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8BAQH/BQUF/wUFBf8BAQH/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wEBAf8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA+QAAAOcAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA5gAAAKYAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAApQAAACwAAADHAAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAADHAAAAKwAAAAAAAAArAAAApQAAAOgAAAD5AAAA/gAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP4AAAD5AAAA6AAAAKcAAAAsAAAAAMAAAAAAAwAAgAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAABAADAAAAAAAMAACgAAAAgAAAAQAAAAAEAIAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlAAAArAAAAPQAAAD+AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/gAAAPQAAACrAAAAJQAAAKsAAAD+AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP4AAACsAAAA8gAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAPIAAAD+AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/CAgI/wUFBf8AAAD/AAAA/wAAAP8AAAD/AAAA/wMDA/9jZGT/Y2Rk/wMDA/8AAAD/AAAA/wAAAP8AAAD/AAAA/wUFBf8ICAj/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/gAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP9AQUH/c3R0/wkJCf8AAAD/AAAA/wAAAP8AAAD/BgYG/7m7u/+5u7v/BgYG/wAAAP8AAAD/AAAA/wAAAP8JCQn/c3R0/0JDQ/8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/0xNTf/w8vL/jI6O/xAQEP8AAAD/AAAA/wAAAP8GBgb/trm5/7a5uf8GBgb/AAAA/wAAAP8AAAD/EBAQ/4yNjf/w8/P/T1BQ/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/S0xM//X4+P/5+/v/oaOj/xkZGf8AAAD/AAAA/wYGBv+2ubn/trm5/wYGBv8AAAD/AAAA/xkZGf+ho6P/+fv7//b5+f9OT0//AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP9LTEz/7vHx/6aoqP/m6Oj/tri4/yUmJv8AAAD/BgYG/7a5uf+2ubn/BgYG/wAAAP8lJSX/tbe3/+bo6P+kpqb/7vHx/05PT/8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/0tMTP/u8fH/SElJ/05P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", "yt": "data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8AAAD/EAAA/0AAAP9AAAD/cAAA/4AAAP+AAAD/gAAA/4AAAP+AAAD/QAAA/0AAAP8Q////AP///wD///8AAAD/YAAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA/2D///8AAAD/MAAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD/MAAA/1AAAP//AAD//wAA//8AAP//AAD//wAA//8QEP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA/2AAAP+AAAD//wAA//8AAP//AAD//wAA//8AAP//4OD//1BQ//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP+AAAD/gAAA//8AAP//AAD//wAA//8AAP//AAD/////////////wMD//yAg//8AAP//AAD//wAA//8AAP//AAD/gAAA/4AAAP//AAD//wAA//8AAP//AAD//wAA/////////////7Cw//8gIP//AAD//wAA//8AAP//AAD//wAA/4AAAP+AAAD//wAA//8AAP//AAD//wAA//8AAP//4OD//0BA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP+AAAD/UAAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD/YAAA/zAAAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA/zD///8AAAD/YAAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA/2D///8A////AP///wAAAP8QAAD/QAAA/0AAAP+AAAD/gAAA/4AAAP+AAAD/gAAA/4AAAP9AAAD/QAAA/xD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A//8AAP//AADAAwAAgAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAEAAMADAAD//wAA//8AAA==", "gen": "data:image/svg+xml;base64,PHN2ZyByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+R2VuaXVzPC90aXRsZT48cGF0aCBkPSJNMCA2LjgyN2MwIDIuMTY0Ljc5IDQuMTMzIDIuMTY3IDUuNTEuMzkzLjM5My43ODYuNTkgMS4xOC45ODNoLjE5NWMuMTk3IDAgLjE5Ni0uMTk2LjE5Ni0uMTk2LS4zOTMtLjc4Ny0uNTg4LTEuNzctLjU4OC0yLjc1NCAwLTIuMTY0Ljk4Mi00LjMyOSAyLjM2LTUuNzA2VjEuNTE4YzAtLjE5Ny0uMTk3LS4xOTYtLjE5Ny0uMTk2aC0yLjk1Qy43ODkgMi44OTYgMCA0LjY2NCAwIDYuODI3em0yLjU1OSAxMi41OWMyLjM2IDIuMTY0IDUuMzEgMy4zNDMgOC44NTEgMy4zNDMgNy4wODIgMCAxMi41OS01LjcwMiAxMi41OS0xMi41ODYgMC0zLjM0NC0xLjM3OC02LjQ5Mi0zLjU0Mi04LjY1NmgtLjE5NmMwLS4xOTctLjE5NiAwLS4xOTYgMCAuNTkgMS41NzQuOTgzIDMuMTQ3Ljk4MyA0LjkxOCAwIDcuMjc4LTUuOTAyIDEzLjM3My0xMy4zNzcgMTMuMzczLTEuNzcgMC0zLjM0NC0uMzkzLTQuOTE3LS45ODMtLjE5NyAwLS4xOTYuMTk5LS4xOTYuMzk1em01LjktMTEuOTk4YzAgLjU5LjM5NSAxLjE3OC43ODggMS41NzFoLjM5MmMzLjU0IDEuMTggNC43MjItLjE5MyA0LjcyMi0xLjc2N1Y1LjA1NmMwLS4xOTYuMTk2LS4xOTYuMTk2LS4xOTZoLjc4N2MuMTk3IDAgLjE5Ni0uMTk2LjE5Ni0uMTk2LS4xOTYtMS4xOC0uNzg0LTIuMzU4LTEuNTcxLTMuMzQyaC0yLjM2M2MwLS4xOTctLjE5NiAwLS4xOTYuMTk2djIuOTVjMCAxLjU3NC0xLjE4IDIuNzU0LTIuNzU0IDIuOTUxIDAtLjE5Ny0uMTk2IDAtLjE5NiAweiIvPjwvc3ZnPg==", "pin": "data:image/vnd.microsoft.icon;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6Q0QwQjQ1NzA2N0U1MTFFMEFBOUM5NjQ5RTdEQTgyOTIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6Q0QwQjQ1NzE2N0U1MTFFMEFBOUM5NjQ5RTdEQTgyOTIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpDRDBCNDU2RTY3RTUxMUUwQUE5Qzk2NDlFN0RBODI5MiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpDRDBCNDU2RjY3RTUxMUUwQUE5Qzk2NDlFN0RBODI5MiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PletPDsAAALzSURBVHjabFNtSFNRGH7v3d2Hm7pPdVM3k1xZmEpEkPah9vnDxNRAIhILK7N+BEFRRFYUFQj9iEypMAwqlRbRj0pTMT8KNSuXFmI1UzdxY9/LXae3c445Bnrgcs553+d57nvO+xyqL3E1hA5NxfGEWavtHGs257BmSzyOCTTqcYFa3caPjrppvlP9KxRPhQqo9hfWuDq7DyMyA8sMJBKI3Lq5ztrQVLZEQL5nV6f99dvMxQQtFAITpZqlGGZuzukSBOx2ejEn272zx/GmOSMooCwqqLM1PS/BAV5EBKhPHANlQT7wlQqkRAM3Owuu910wUXUb/g5/JyLKon31tibDIWr8VtVa69OGwYDdQfNVStA/egCiVXqYqrkPzvYOApasTwfNyXKyHik5At6BL8DIpJzqQHEqgy7qMibjpO5qJSH/KCwG79dBDIKAwwmevn5wd/VAsqEBEm5cg+G9BThOsZPmKzQ79mcbJgt1OhadDSx3awhZX/8QUjregSR1Hfmz79sQuDq7IEyfBKLEFR4c85tMW2j/2JgCb/gx0VY8O5pbIGxNMkRmZgAvPBwYhSLYBVQpmXkSiQ/P7PiEnOY4oPCGY1kRSSIS5/cT4JzbDT6jMSggjItdiHu9YrLgOIoWauPteD0z+lMesNnIZc35fDgJnt5+QKYiWGQiEKekoCrswE5MSogv4uIctFCn7SaqHg81UlrmcH/sBUlaKmowRUQW3EJB3JnTQIvDYPrxE4JduDftB0YQG3sJ9T4XlUv5jEMy9IH24nlCjsjcBMkvGoEnFoMoaSU429rBUl0L/4/KoQoqacu92gHZjhxDqGXDN24AdmoKRg6W4qORz3T2AowerYD5mRmCkW7Pfom4vUErS3OyPjtb29N40khI6+sBZ0srjJafWu5JgDQ7y4iqIf0N+huR0xV5ua/EqIW4fOuzxiVERi6bV+TnGRbJS14jHugdaJCA1PtpoGXmt0mNxZDJplG3uvkxMddR2f2h+H8CDABF/Dlktzcv0wAAAABJRU5ErkJggg=="};
  const providers = {
    gpt: { name: 'ChatGPT', home: 'https://chatgpt.com/', path: '/', param: 'q' },
    per: { name: 'Perplexity', home: 'https://www.perplexity.ai/', path: '/search', param: 'q' },
    yt: { name: 'YouTube', home: 'https://www.youtube.com/', path: '/results', param: 'search_query' },
    gen: { name: 'Genius', home: 'https://genius.com/', path: '/search', param: 'q' },
    pin: { name: 'Pinterest', home: 'https://www.pinterest.com/', path: '/search/pins/', param: 'q' },
  };
  let cleanup = () => {}, disposed = false;
  function initialize() {
    if (disposed) return;
    const bar = document.getElementById('urlbar');
    const input = document.getElementById('urlbar-input');
    const box = input?.closest('.urlbar-input-box');
    if (!bar || !input || !box || !window.gURLBar) return;
    let active = null;
    const originalPlaceholder = input.getAttribute('placeholder');
    const make = name => document.createElementNS('http://www.w3.org/1999/xhtml', name);
    const badge = make('button');
    badge.className = 'letter-tabs-bang-chip';
    badge.type = 'button';
    badge.hidden = true;
    const icon = make('img');
    icon.alt = '';
    icon.width = icon.height = 14;
    const label = make('span');
    badge.append(icon, label);
    box.before(badge);
    const suggestions = make('div');
    suggestions.className = 'letter-tabs-bang-suggestions';
    suggestions.hidden = true;
    suggestions.id = 'letter-tabs-bang-suggestions';
    suggestions.setAttribute('role', 'listbox');
    bar.append(suggestions);
    let matches = [], selected = 0;
    function hideSuggestions() {
      suggestions.hidden = true;
      bar.removeAttribute('letter-tabs-bang-suggesting');
      input.removeAttribute('aria-activedescendant');
      matches = [];
    }
    function highlight() {
      [...suggestions.children].forEach((row, index) => {
        row.setAttribute('aria-selected', String(index === selected));
      });
      input.setAttribute('aria-activedescendant', `letter-tabs-bang-option-${matches[selected]}`);
    }
    function showSuggestions(prefix) {
      matches = Object.keys(providers).filter(key => key.startsWith(prefix.toLowerCase()));
      if (!matches.length) { hideSuggestions(); return false; }
      selected = 0;
      suggestions.replaceChildren();
      for (const key of matches) {
        const row = make('div'), image = make('img'), name = make('span'), command = make('span');
        row.id = `letter-tabs-bang-option-${key}`;
        row.setAttribute('role', 'option');
        image.src = icons[key];
        image.alt = '';
        name.textContent = providers[key].name;
        command.textContent = `!${key}`;
        command.className = 'letter-tabs-bang-command';
        row.append(image, name, command);
        row.addEventListener('mousedown', event => event.preventDefault());
        row.addEventListener('click', () => { activate(key, ''); input.focus(); });
        suggestions.append(row);
      }
      suggestions.hidden = false;
      bar.setAttribute('letter-tabs-bang-suggesting', 'true');
      highlight();
      cancelResults();
      return true;
    }
    function pinnedTarget(provider) {
      const browser = window.gBrowser;
      if (!browser) return null;
      const container = browser.selectedTab?.getAttribute('usercontextid') || '0';
      const workspace = window.gZenWorkspaces?.activeWorkspace;
      const host = new URL(provider.home).hostname.replace(/^www\./, '');
      const candidates = [...browser.tabs].filter(tab => {
        if (!tab.pinned || tab.closing || tab.hasAttribute('zen-glance-tab')) return false;
        if ((tab.getAttribute('usercontextid') || '0') !== container) return false;
        const tabSpace = tab.getAttribute('zen-workspace-id');
        if (!tab.hasAttribute('zen-essential') && workspace && tabSpace && tabSpace !== workspace) return false;
        const address = tab._zenPinnedInitialState?.entry?.url || tab.linkedBrowser?.currentURI?.spec;
        try { return new URL(address).hostname.replace(/^www\./, '') === host; }
        catch { return false; }
      });
      return candidates.find(tab => tab === browser.selectedTab) || candidates[0] || null;
    }
    function setValue(value) {
      window.gURLBar.value = value;
      input.value = value;
      window.gURLBar.userTypedValue = value;
      input.setSelectionRange(value.length, value.length);
      bar.toggleAttribute('letter-tabs-search-empty', !value.trim());
    }
    function cancelResults() {
      window.gURLBar.controller?.cancelQuery();
      const view = window.gURLBar.view;
      if (view) {
        // selectedRowIndex rewrites the input from the previous native query
        // and throws when the results are closed. Preserve the typed query.
        view.clearSelection();
        if (view.oneOffSearchButtons) view.oneOffSearchButtons.selectedButton = null;
      }
    }
    function clearMode() {
      active = null;
      hideSuggestions();
      badge.hidden = true;
      bar.removeAttribute('letter-tabs-bang');
      icon.removeAttribute('src');
      if (originalPlaceholder === null) input.removeAttribute('placeholder');
      else input.setAttribute('placeholder', originalPlaceholder);
    }
    function activate(key, query) {
      hideSuggestions();
      active = key;
      const provider = providers[key];
      window.gURLBar.searchMode = null;
      badge.hidden = false;
      badge.title = `Exit ${provider.name} search`;
      badge.setAttribute('aria-label', `Exit ${provider.name} search`);
      label.textContent = provider.name;
      icon.hidden = false;
      // Bundled assets work with an empty favicon cache and while offline.
      icon.src = icons[key];
      bar.setAttribute('letter-tabs-bang', key);
      input.setAttribute('placeholder', `Search ${provider.name}`);
      setValue(query);
      cancelResults();
    }
    icon.addEventListener('error', () => { icon.hidden = true; });
    function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }
    function onInput(event) {
      if (event.target !== input) return;
      if (event.isComposing) {
        if (active) { event.stopImmediatePropagation(); cancelResults(); }
        return;
      }
      if (!active && /^![a-z]*$/i.test(input.value) && !providers[input.value.slice(1).toLowerCase()]) {
        if (showSuggestions(input.value.slice(1))) { event.stopImmediatePropagation(); return; }
      }
      hideSuggestions();
      const match = /^!(gpt|per|yt|gen|pin)(?:\s+(.*))?$/is.exec(input.value);
      if (match) {
        event.stopImmediatePropagation();
        activate(match[1].toLowerCase(), match[2] || '');
      } else if (active) {
        event.stopImmediatePropagation();
        window.gURLBar.userTypedValue = input.value;
        bar.toggleAttribute('letter-tabs-search-empty', !input.value.trim());
        cancelResults();
      }
    }
    function onKey(event) {
      if (event.target !== input || event.isComposing) return;
      if (!suggestions.hidden) {
        if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
          stop(event);
          if (event.key === 'Escape') hideSuggestions();
          else if (event.key === 'Enter' || event.key === 'Tab') activate(matches[selected], '');
          else {
            selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
            highlight();
          }
          return;
        }
      }
      if (!active) return;
      if (event.key === 'Escape' || (event.key === 'Backspace' && !input.value)) {
        stop(event);
        clearMode();
        return;
      }
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Tab'].includes(event.key)) {
        if (event.key !== 'Tab') stop(event);
        return;
      }
      if (event.key !== 'Enter') return;
      stop(event);
      const query = input.value.trim();
      if (!query) return;
      const provider = providers[active];
      const url = new URL(provider.path, provider.home);
      url.searchParams.set(provider.param, query);
      const target = pinnedTarget(provider);
      cancelResults();
      clearMode();
      if (target) {
        // Complete Zen's floating-urlbar lifecycle, as native navigation does.
        if (typeof window.gURLBar._zenHandleUrlbarClose === 'function') {
          window.gURLBar._zenHandleUrlbarClose(true, true);
        } else {
          window.gURLBar.view.close({ elementPicked: true });
        }
        window.gBrowser.selectedTab = target;
        window.gBrowser.loadURI(Services.io.newURI(url.href), {
          triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
        });
        target.linkedBrowser.focus();
        return;
      }
      setValue(url.href);
      window.gURLBar.handleCommand(event);
    }
    badge.addEventListener('mousedown', event => event.preventDefault());
    badge.addEventListener('click', () => { clearMode(); input.focus(); });
    function onBlur() { clearMode(); }
    input.addEventListener('blur', onBlur);
    const observer = new MutationObserver(() => {
      if ((active || !suggestions.hidden) && (!bar.hasAttribute('focused') || !bar.hasAttribute('breakout-extend'))) clearMode();
    });
    observer.observe(bar, { attributes: true, attributeFilter: ['focused', 'breakout-extend'] });
    window.addEventListener('input', onInput, true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('TabSelect', clearMode);
    cleanup = () => {
      observer.disconnect();
      input.removeEventListener('blur', onBlur);
      window.removeEventListener('input', onInput, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('TabSelect', clearMode);
      clearMode();
      badge.remove();
      suggestions.remove();
    };
  }
  function destroy() {
    disposed = true;
    window.removeEventListener('load', initialize);
    window.removeEventListener('unload', destroy);
    cleanup();
    delete window.__letterTabsBangs;
  }
  window.__letterTabsBangs = { destroy };
  if (typeof window.addUnloadListener === 'function') window.addUnloadListener(destroy);
  window.addEventListener('unload', destroy, { once: true });
  if (document.readyState === 'complete') initialize();
  else window.addEventListener('load', initialize, { once: true });
})();
