(function () {
  var key = window.storageKeyForUser ? window.storageKeyForUser("dominon_kanban_projects_") : "dominon_kanban_projects_guest";
  var projects = [];
  try { projects = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
  var root = document.getElementById("kanban-projects");
  var search = document.getElementById("kanban-search");
  var kanbanView = document.getElementById("kanban-view");
  var themes = ["black","light","purple","green","red","blue"];
  function setKanbanTheme(theme) {
    themes.forEach(function (name) { kanbanView.classList.remove(name + "-theme"); });
    kanbanView.classList.add((themes.indexOf(theme) >= 0 ? theme : "black") + "-theme");
    localStorage.setItem("dominon_kanban_theme", theme);
  }
  setKanbanTheme(localStorage.getItem("dominon_kanban_theme") || "black");
  if (localStorage.getItem("dominon_kanban_anim") === "off") kanbanView.classList.add("kanban-anim-off");
  document.getElementById("kanban-settings").onclick = function () {
    window.dominonDialog({ title:"Configuración de Kanban", fields:[
      {name:"theme",label:"Tema",type:"select",value:localStorage.getItem("dominon_kanban_theme")||"black",options:themes.map(function(t){return {value:t,label:t.charAt(0).toUpperCase()+t.slice(1)};})},
      {name:"animations",label:"Animaciones",type:"select",value:localStorage.getItem("dominon_kanban_anim")||"on",options:[{value:"on",label:"Activadas"},{value:"off",label:"Desactivadas"}]}
    ]}).then(function (result) { if (!result) return; setKanbanTheme(result.theme); localStorage.setItem("dominon_kanban_anim",result.animations); kanbanView.classList.toggle("kanban-anim-off",result.animations==="off"); });
  };
  var stages = [["todo","Por hacer"],["doing","En progreso"],["done","Completado"]];
  function save() {
    localStorage.setItem(key, JSON.stringify(projects));
    if (window.isPremiumPlan && window.isPremiumPlan() && window.saveKanbanCloud) window.saveKanbanCloud(projects);
  }
  window.setKanbanProjects = function (next, persist) {
    projects = Array.isArray(next) ? next : [];
    if (persist !== false) save();
    render();
  };
  window.initKanbanForUser = async function () {
    key = window.storageKeyForUser ? window.storageKeyForUser("dominon_kanban_projects_") : "dominon_kanban_projects_guest";
    try {
      var stored = localStorage.getItem(key);
      if (!stored && localStorage.getItem("dominon_kanban_projects")) {
        stored = localStorage.getItem("dominon_kanban_projects");
        localStorage.setItem(key, stored);
      }
      projects = JSON.parse(stored || "[]");
    } catch (e) { projects = []; }
    render();
    if (window.isPremiumPlan && window.isPremiumPlan() && window.loadKanbanCloud) await window.loadKanbanCloud();
  };
  function editProject(project) {
    window.dominonDialog({ title: project ? "Editar proyecto" : "Nuevo proyecto", fields: [
      { name:"name", label:"Nombre", value:project ? project.name : "", required:true },
      { name:"description", label:"Descripción", type:"textarea", value:project ? project.description : "" },
      { name:"priority", label:"Prioridad", type:"select", value:project ? project.priority : "Media", options:[{value:"Baja",label:"Baja"},{value:"Media",label:"Media"},{value:"Alta",label:"Alta"}] }
    ]}).then(function (result) {
      if (!result) return;
      if (project) Object.assign(project, result);
      else { projects.unshift({ id:Date.now(), name:result.name, description:result.description, priority:result.priority, tasks:[] }); animate("project"); }
      save(); render();
    });
  }
  function editTask(project, task) {
    window.dominonDialog({ title: task ? "Editar tarea" : "Nueva tarea", fields: [
      { name:"name", label:"Nombre", value:task ? task.name : "", required:true },
      { name:"description", label:"Descripción", type:"textarea", value:task ? task.description : "" },
      { name:"priority", label:"Prioridad", type:"select", value:task ? task.priority : "Media", options:[{value:"Baja",label:"Baja"},{value:"Media",label:"Media"},{value:"Alta",label:"Alta"}] },
      { name:"due", label:"Fecha límite", type:"date", value:task ? task.due : "" }
    ]}).then(function (result) {
      if (!result) return;
      if (task) Object.assign(task, result);
      else { project.tasks.push({ id:Date.now(), ...result, stage:"todo" }); animate("task"); }
      save(); render();
    });
  }
  function animate(type) {
    if (kanbanView.classList.contains("kanban-anim-off")) return;
    var node = document.createElement("span");
    node.className = "kanban-particle " + type;
    node.textContent = "✦";
    document.body.appendChild(node);
    setTimeout(function(){node.remove();},650);
  }
  function render() {
    var filter = (search.value || "").toLowerCase();
    root.innerHTML = "";
    projects.filter(function (p) { return (p.name + " " + p.description + " " + p.tasks.map(function(t){return t.name+" "+t.description;}).join(" ")).toLowerCase().includes(filter); }).forEach(function (project) {
      var section = document.createElement("section");
      section.className = "kanban-project";
      section.innerHTML = '<header><div><h2></h2><p></p><span class="kanban-priority"></span></div><div class="project-actions"><button class="edit-project">Editar</button><button class="add-task">＋ Tarea</button><button class="delete-project" aria-label="Eliminar proyecto">×</button></div></header><div class="kanban-columns"></div>';
      section.querySelector("h2").textContent = project.name;
      section.querySelector("header p").textContent = project.description || "Sin descripción";
      section.querySelector(".kanban-priority").textContent = "Prioridad " + project.priority;
      section.querySelector(".edit-project").onclick = function(){editProject(project);};
      section.querySelector(".add-task").onclick = function(){editTask(project);};
      section.querySelector(".delete-project").onclick = function(){if(!kanbanView.classList.contains("kanban-anim-off")) section.classList.add("kanban-exit");setTimeout(function(){projects=projects.filter(function(p){return p!==project;});save();render();},kanbanView.classList.contains("kanban-anim-off")?0:180);};
      var columns=section.querySelector(".kanban-columns");
      stages.forEach(function(stage){
        var col=document.createElement("div"); col.className="kanban-column"; col.dataset.stage=stage[0];
        col.innerHTML='<h3>'+stage[1]+' <span></span></h3><div class="kanban-cards"></div>';
        var tasks=project.tasks.filter(function(t){return t.stage===stage[0];});
        col.querySelector("h3 span").textContent=tasks.length;
        tasks.forEach(function(task){
          var card=document.createElement("article"); card.className="kanban-card"; card.draggable=true;
          card.innerHTML='<button class="task-edit" title="Editar"><i class="fa-solid fa-pen"></i></button><h4></h4><p></p><small></small>';
          card.querySelector("h4").textContent=task.name; card.querySelector("p").textContent=task.description;
          card.querySelector("small").textContent=task.priority+" · "+(task.due||"Sin fecha");
          card.querySelector(".task-edit").onclick=function(){editTask(project,task);};
          card.ondragstart=function(e){e.dataTransfer.setData("text/plain",String(task.id));};
          col.querySelector(".kanban-cards").appendChild(card);
        });
        col.ondragover=function(e){e.preventDefault();};
        col.ondrop=function(e){e.preventDefault();var id=Number(e.dataTransfer.getData("text/plain"));var task=project.tasks.find(function(t){return t.id===id;});if(task){task.stage=stage[0];save();render();animate("task");}};
        columns.appendChild(col);
      });
      root.appendChild(section);
    });
  }
  document.getElementById("kanban-new-project").onclick=function(){editProject(null);};
  search.addEventListener("input",render);
  render();
})();
