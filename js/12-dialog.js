(function () {
  var backdrop = document.getElementById("dominon-dialog");
  var form = document.getElementById("dominon-dialog-form");
  var fields = document.getElementById("dominon-dialog-fields");
  var title = document.getElementById("dominon-dialog-title");
  var resolveDialog;

  window.dominonDialog = function (options) {
    options = options || {};
    title.textContent = options.title || "Editar";
    fields.innerHTML = "";
    (options.fields || [{ name: "name", label: "Nombre", value: "", required: true }]).forEach(function (field) {
      var label = document.createElement("label");
      label.textContent = field.label;
      var input = field.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
      input.name = field.name;
      input.value = field.value || "";
      input.placeholder = field.placeholder || "";
      input.required = !!field.required;
      if (field.type && field.type !== "textarea") input.type = field.type;
      if (field.type === "select") {
        input = document.createElement("select");
        input.name = field.name;
        field.options.forEach(function (option) {
          var item = document.createElement("option");
          item.value = option.value;
          item.textContent = option.label;
          input.appendChild(item);
        });
        input.value = field.value;
      }
      label.appendChild(input);
      fields.appendChild(label);
    });
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
    var first = fields.querySelector("input,textarea,select");
    if (first) first.focus();
    return new Promise(function (resolve) { resolveDialog = resolve; });
  };

  function close(value) {
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
    if (resolveDialog) resolveDialog(value);
    resolveDialog = null;
  }
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var result = {};
    new FormData(form).forEach(function (value, key) { result[key] = value; });
    close(result);
  });
  form.querySelector(".dialog-cancel").addEventListener("click", function () { close(null); });
  backdrop.addEventListener("click", function (event) { if (event.target === backdrop) close(null); });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape" && backdrop.classList.contains("open")) close(null); });
})();
