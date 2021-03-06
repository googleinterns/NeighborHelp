// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const MAPSKEY = config.MAPS_KEY;
const MAP_STYLE = styles;
const GOOGLE_KIRKLAND_LAT = 47.669846;
const GOOGLE_KIRKLAND_LNG = -122.1996099;
let map;
let oms;
let neighborhood = [null , null];
let userLocation = null;
let userActualLocation = null;
let currentCategory = "all";
let currentView = "list";
let markersMap = new Map();
let markersToHide = new Map();
let infoWindows = [];
let taskGroup = null;

/* Changes navbar background upon resize */
window.addEventListener("resize", function() {
    let navbar = document.getElementsByTagName("nav")[0];
    if (window.innerWidth < 1204) navbar.style.backgroundColor = "white";
    else navbar.style.backgroundColor = "transparent";
});

/* Changes navbar background upon scroll */
window.onscroll = function() {
    if (window.innerWidth >= 1204) {
        let navbar = document.getElementsByTagName("nav")[0];
        OFFSET = 180; // approx distance from top of page to top of control (categories) bar
        if (window.pageYOffset >= OFFSET || document.body.scrollTop >= OFFSET || document.documentElement.scrollTop >= OFFSET) {
            navbar.style.backgroundColor = "white";
        } else navbar.style.backgroundColor = "transparent";
    }
}

/* Adds scroll event listener to load more tasks if the user has reached the bottom of the page */
document.addEventListener("scroll", function() {
    if (getDocumentHeight() == getVerticalScroll() + window.innerHeight && currentView == "list") {
        loadMoreTasks();
    }
})

/* Returns document height using different methods of doing so that differ by browser */
function getDocumentHeight() {
    return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
        document.body.clientHeight, document.documentElement.clientHeight);
}

/* Returns the vertical scroll the user has gone using different methods of doing so that differ by browser */
function getVerticalScroll() {
    let verticalScroll = 0;
    if( typeof( window.pageYOffset ) == 'number' ) {
        verticalScroll = window.pageYOffset;
    } else if( document.body && document.body.scrollTop) {
        verticalScroll = document.body.scrollTop;
    } else if( document.documentElement && document.documentElement.scrollTop) {
        verticalScroll = document.documentElement.scrollTop;
    }
    return verticalScroll;
}

/* Calls addUIClickHandlers and getTasksForUserLocation once page has loaded */
if (document.readyState === 'loading') {
    // adds on load event listeners if document hasn't yet loaded
    document.addEventListener('DOMContentLoaded', addUIClickHandlers);
    document.addEventListener('DOMContentLoaded', getTasksForUserLocation);
} else {
    // if DOMContentLoaded has already fired, it simply calls the functions
    addUIClickHandlers();
    getTasksForUserLocation();
}

/* Function adds all the necessary UI 'click' event listeners*/
function addUIClickHandlers() {
    // adds showCreateTaskModal and closeCreateTaskModal click events for the add task button
    if ((document.getElementById("create-task-button") !== null)) {
        document.getElementById("create-task-button").addEventListener("click", showCreateTaskModal);
    	document.getElementById("close-addtask-button").addEventListener("click", closeCreateTaskModal);
    }

    // adds filterTasksBy click event listener to category buttons
    const categoryButtons = document.getElementsByClassName("categories");
    for (let i = 0; i < categoryButtons.length; i++) {
        categoryButtons[i].addEventListener("click", function(e) {
            filterTasksBy(e.target.id);
        });
    }
    // adds showTopScoresModal and closeTopScoresModal click event
    document.getElementById("topscore-button").addEventListener("click", showTopScoresModal);
    document.getElementById("close-topscore-button").addEventListener("click", closeTopScoresModal);

    // adds closeTaskInfoModal click event
    document.getElementById("task-info-close-button").addEventListener("click", closeTaskInfoModal);

    // adds click event to switch to list view
    document.getElementsByClassName("view-option")[0].addEventListener("click", function(e) {
        switchView(e.target);
    });

    // adds click event to switch to map view
    document.getElementsByClassName("view-option")[1].addEventListener("click", function(e) {
        switchView(e.target);
    });

    // adds click event for the map view's load more tasks control button
    document.getElementById("load-more-tasks-control").addEventListener("click", loadMoreTasks);
}

/* Function implements switch view (to map or to list) click functionality */
function switchView(element) {
    let buttonElement = element;

    // If element clicked was icon inside the parent div, it gets the parent div
    if (element.classList.contains("fas")) {
        buttonElement = element.parentNode;
    }

    document.getElementById("selected-view").removeAttribute("id");
    buttonElement.setAttribute("id", "selected-view");
    const loadingElement = document.getElementById("loading");

    // Switch to Map view
    if (buttonElement.value == "map") {
        // if loading has finished, it switches views
        if (loadingElement.style.display == "none") switchToMap();
        // otherwise it creates a mutation observer that will call switchToMap once loading is complete
        else {
            let observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.attributeName !== "style") return;
                    if (loadingElement.style.display == "none") {
                        switchToMap();
                    }
                });
            });
            observer.observe(document.getElementById("loading"), {attributes: true});
        }

    // Switch to List View
    } else if (buttonElement.value == "list") {
         // if loading has finished, it switches views
        if (loadingElement.style.display == "none") switchToList();
        // otherwise it creates a mutation observer that will call switchToList once loading is complete
        else {
            let observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.attributeName !== "style") return;
                    if (loadingElement.style.display == "none") {
                        switchToList();
                    }
                });
            });
            observer.observe(document.getElementById("loading"), {attributes: true});
        }
    }
}

/* Helper function that switches to map view */
function switchToMap() {
    document.getElementById("tasks-list").style.display = "none";
    document.getElementById("tasks-map-wrapper").style.display = "block"
    currentView = "map";

    // centers map on user location
    map.setCenter(userLocation);

    // displays task markers for each task
    taskGroup.tasks.forEach(task => displayTaskMarker(task));

    let loadMoreTasksMapControl = document.getElementById("load-more-tasks-control");
    // hides or shows load more tasks control button if there are more results or not
    if (taskGroup.endOfQuery) loadMoreTasksMapControl.style.display = "none";
    else loadMoreTasksMapControl.style.display = "block";
}

/* Helper function that switches to list view */
function switchToList() {
    document.getElementById("tasks-map-wrapper").style.display = "none";
    document.getElementById("tasks-list").style.display = "block";
    currentView = "list";
}
/* Function loads ten more tasks if there are any more, otherwise it displays a message saying there are no more tasks */
function loadMoreTasks() {
    if (userNeighborhoodIsKnown()) {
        if (!taskGroup.endOfQuery) {
            fetchTasks(currentCategory, "end")
                .then(response => {
                        taskGroup = response;
                        displayTasks(true);
                    });
        } else if (!document.getElementById("no-more-tasks") && document.getElementById("no-tasks-message").style.display == "none") {
            let noMoreTasksDiv = document.createElement("div");
            noMoreTasksDiv.setAttribute("id", "no-more-tasks");
            noMoreTasksDiv.classList.add("results-message");
            noMoreTasksDiv.innerText = "There are no more tasks in your neighborhood";
            noMoreTasksDiv.style.display = "block";
            document.getElementById("tasks-list").appendChild(noMoreTasksDiv);
        }                
    } 
}

/* Function filters tasks by categories and styles selected categories */
function filterTasksBy(category) {
    currentCategory = category;

    // only fetches tasks if user's location has been retrieved
    if (userNeighborhoodIsKnown()) {
        fetchTasks(currentCategory, "clear")
            .then(response => {
                    taskGroup = response;
                    displayTasks();
                });
    }
	// Unhighlights and resets styling for all category buttons
    const categoryButtons = document.getElementsByClassName("categories");
    for (let i = 0; i < categoryButtons.length; i++){
        let button = categoryButtons[i];
        if (document.getElementById(category) != button) {
            button.style.backgroundColor = "rgb(76, 175, 80)";
        	button.addEventListener("mouseover", function() {
                button.style.backgroundColor = "rgb(62, 142, 65)";
            });
            button.addEventListener("mouseout", function() {
                button.style.backgroundColor = "rgb(76, 175, 80)"
            });
        } else {
            button.style.backgroundColor = "rgb(62, 142, 65)";
            button.addEventListener("mouseover", function() {
                button.style.backgroundColor = "rgb(62, 142, 65)";
            });
            button.addEventListener("mouseout", function() {
                button.style.backgroundColor = "rgb(62, 142, 65)"
            });
        }
    }
}

/* Function that display the help out overlay */
function helpOut(element) {
    const task = element.closest(".task");
    const overlay = task.getElementsByClassName("help-overlay");
    overlay[0].style.display = "block";
}

/* Function sends a fetch request to the edit task servlet when the user
offers to help out, edits the task's status and helper properties, and
then reloads the task list */
function confirmHelp(taskKey) {
    if (!markersMap.has(taskKey) || markersToHide.has(taskKey)) return;
    const url = "/tasks/edit?task-id=" + taskKey + "&action=helpout";
    const request = new Request(url, {method: "POST"});
    fetch(request).then((response) => {
        // checks if another user has already claimed the task
        if (response.status == 409) {
            window.alert
                ("We're sorry, but the task you're trying to help with has already been claimed by another user.");
            window.location.href = '/';
        }
        // hides task from list and map if it was succesfully claimed
        else {

            // hides task that was claimed from list
            document.querySelectorAll("[data-key='" + taskKey +"']")[0].style.display = "none";
            
            // keeps tabs on which tasks have been claimed so they are later not displayed in map view
            markersToHide.set(taskKey, markersMap.get(taskKey));

            // deletes task markers from map
            // (when switching to map view, displayTaskMarker is called again, 
            // which will retrieve all task markers again until reload -
            // this is where markersToHide comes along)
            oms.forgetMarker(markersMap.get(taskKey));
            markersMap.get(taskKey).setMap(null);
            markersMap.delete(taskKey);

            if (markersMap.size == 0) {
                document.getElementById("tasks-list").style.display = "none";
                document.getElementById("no-tasks-message").style.display = "block";
            }
            
        }
    });
}

/* Function that hides the help out overlay */
function exitHelp(element) {
	element.closest(".help-overlay").style.display = "none";
}

/* Leonard's implementation of the Add Task modal */
function showCreateTaskModal() {
    var modal = document.getElementById("createTaskModalWrapper");
    modal.style.display = "block";
}

function closeCreateTaskModal() {
    var modal = document.getElementById("createTaskModalWrapper");
    modal.style.display = "none";
}

function validateTaskForm(id) {
    var result = true;
    var form = document.getElementById(id);
    var inputName = ["task-overview", "task-detail", "reward", "category"];
    for (var i = 0; i < inputName.length; i++) {
        var name = inputName[i];
        var inputField = form[name.concat("-input")].value.trim();
        if (inputField === "") {
            result = false;
            form[name.concat("-input")].classList.add("highlight");
        } else {
            form[name.concat("-input")].classList.remove("highlight");
        }
    }
    if (!result) {
        alert("All fields are required. Please fill out all fields with non-empty input and mark your personal address on the map.");
        return false;
    }
    return true;
}

/* Function that calls the loadTopScorers functions
   and then shows the top scores modal */
function showTopScoresModal() {
    loadTopScorers("world");
    if (userNeighborhoodIsKnown()){
      loadTopScorers("neighborhood");
    }
    document.getElementById("topScoresModalWrapper").style.display = "block";
}

/* Function closes the top scores modal */
function closeTopScoresModal() {
    document.getElementById("topScoresModalWrapper").style.display = "none";
}

/* Function loads the data for the top scorers table */
function loadTopScorers(location) {
    let url = "/account?action=topscorers";
    if (location === "neighborhood") {
      url += "&zipcode=" + neighborhood[0] + "&country=" + neighborhood[1];
    }
    fetch(url)
      .then(response => response.json())
      .then(users => {
        // Inserts Nickname and Points for every top scorer
        for (let i = 0; i < users.length; i++) {
          let points = users[i].points;
          let nickname = users[i].nickname;
          let rowId = location + (i + 1);
          let row = document.getElementById(rowId);
          let rowNickname = row.getElementsByClassName("topscore-nickname")[0];
          let rowScore = row.getElementsByClassName("topscore-score")[0];
          rowNickname.innerText = nickname;
          rowScore.innerText = points;
          // Adds different styling if row includes current user
          if (users[i].isCurrentUser) {
            row.style.fontWeight = "bold";
            row.setAttribute("title", "Congratulations, you made it to the Top Scorers Board!");
          }
        }
    });
}

// If the user clicks outside of the modals, closes the modals directly
window.onclick = function(event) {
    var createTaskModal = document.getElementById("createTaskModalWrapper");
    if (event.target == createTaskModal) {
        createTaskModal.style.display = "none";
    }
    var topScoresModal = document.getElementById("topScoresModalWrapper");
    if (event.target == topScoresModal) {
        topScoresModal.style.display = "none";
    }

    var infoModal = document.getElementById("taskInfoModalWrapper");
    if (event.target == infoModal) {
        infoModal.style.display = "none";
    }
}

/* Leonard's implementation of showing task details in a pop up window */
async function getTaskInfo(keyString) {
    const queryURL = "/tasks/info?key=" + keyString;
    const request = new Request(queryURL, {method: "GET"});
    const response = await fetch(request);
    const info = await response.json();
    return info;
}

async function showTaskInfo(taskKey) {
    const info = await getTaskInfo(taskKey);
    var detailContainer = document.getElementById("task-detail-container");
    detailContainer.innerHTML = "";
    detailContainer.appendChild(document.createTextNode(info.detail));
    var modal = document.getElementById("taskInfoModalWrapper");
    modal.style.display = "block";
}

function closeTaskInfoModal() {
    var modal = document.getElementById("taskInfoModalWrapper");
    modal.style.display = "none";
}

/* Function dynamically adds Maps API and
begins the processes of retrieving the user's location*/
function getTasksForUserLocation() {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =  "https://maps.googleapis.com/maps/api/js?key=" + MAPSKEY + "&callback=initialize&libraries=places&language=en";
    script.defer = true;
    script.async = true;
    document.head.appendChild(script);

	window.initialize = function () {
    
        // initialize map
        map = new google.maps.Map(document.getElementById("tasks-map"), {
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            center: {lat: GOOGLE_KIRKLAND_LAT, lng: GOOGLE_KIRKLAND_LNG},
            zoom: 12,
            styles: MAP_STYLE,
        });
        map.setTilt(45);

        // creates event listener for dragging and releasing map. If map is centered in a new neighborhood,
        // then the Search this neighborhood control appears.
        map.addListener('dragend', function() {
            previousNeighborhood = [...neighborhood];
            toNeighborhood(map.getCenter().toJSON()).then(() => {
                if (previousNeighborhood[0] != neighborhood[0] || previousNeighborhood[1] != neighborhood[1]) {
                    let searchNeighborhoodNode = document.createElement("div");
                    searchNeighborhoodNode.index = 1;
                    map.controls[google.maps.ControlPosition.TOP_CENTER].push(searchNeighborhoodNode);
                    new SearchNeighborhoodMapControl(searchNeighborhoodNode);
                } 
            });
        });

        // closes info windows if user clicks anywhere else on the map
        map.addListener("click", (event) => {
            infoWindows.forEach(infoWindow => {
                    infoWindow.close();
                });
        });

        // Helper class that spiderfies markers that are exactly in the same lat/lng coordinates
        // this is helpful to visualized several tasks from the same user with the same location coordinates
        oms = new OverlappingMarkerSpiderfier(map, {
            markersWontMove: true,
            markersWontHide: false,
            basicFormatEvents: true,
            keepSpiderfied: true
        });

        // gets user location, then calls helper function that calls helper function
        // that calls toNeighborhood, fetchTasks, and displayTasks
        getUserLocation().then(callEndOfInitFunctions);

        // initialize autocomplete input text search box

        // Once the Maps API script has dynamically loaded it initializes the place autocomplete searchbox
        let placeAutocomplete = new google.maps.places.Autocomplete(document.getElementById("place-input"));
        // 'geometry' field specifies that returned data will include the place's viewport and lat/lng
        placeAutocomplete.setFields(['geometry']);

        // listener will use the inputted place to retrieve and display tasks
        google.maps.event.addListener(placeAutocomplete, 'place_changed', function() {
                let place = placeAutocomplete.getPlace();
                if (place.geometry != undefined) {
                    userLocation = place.geometry.location.toJSON();
                } else {
                    userLocation = userActualLocation;
                }
                // calls helper function that calls toNeighborhood, fetchTasks, and displayTasks
                callEndOfInitFunctions();
              });

	}
}

// Helper function that calls the end of the initialize functions
function callEndOfInitFunctions() {
    toNeighborhood(userLocation)
        .then(() => fetchTasks(currentCategory, "clear"))
        .then(response => {
                taskGroup = response;
                map.setCenter(userLocation);
                displayTasks();
            })
        .catch(() => {
            document.getElementById("loading").style.display = "none";
            document.getElementById("location-missing-message").style.display = "block";
        });
}

/** Constructs Search Neighborhood Map Control */
function SearchNeighborhoodMapControl(controlNode) {
    const controlUI = document.createElement("div");
    controlUI.setAttribute("id", "search-area-control");
    controlUI.className = "map-control";
    controlUI.title = "Click to search current neighborhood";
    controlUI.textContent = "Search current neighborhood";
    controlNode.appendChild(controlUI);
    // adds click event listener to search by the new neighborhood area
    controlUI.addEventListener("click", function() {
        fetchTasks(currentCategory, "clear")
            .then(response => {
                    taskGroup = response;
                    displayTasks();
                    // removes search neighborhood control button
                    controlNode.remove();
                })
    });
}

/* Function that returns a promise to get and return the user's location */
function getUserLocation() {
    let url = "https://www.googleapis.com/geolocation/v1/geolocate?key=" + MAPSKEY;
    const request = new Request(url, {method: "POST"});
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                userLocation = {lat: position.coords.latitude, lng: position.coords.longitude};
                userActualLocation = userLocation;
                resolve(userLocation);
            }, function() {
                fetch(request).then(response => {
                    if (response.status == 400 || response.status == 403 || response.status == 404) {
                        reject("User location failed");
                    } else {
                        response.json().then(jsonresponse => {
                            userLocation = jsonresponse["location"];
                            userActualLocation = userLocation;
                            resolve(userLocation);
                        });
                    }
                });
            });
        } else {
            fetch(request).then(response => {
                    if (response.status == 400 || response.status == 403 || response.status == 404) {
                        reject("User location failed");
                    } else {
                        response.json().then(jsonresponse => {
                            userLocation = jsonresponse["location"];
                            userActualLocation = userLocation;
                            resolve(userLocation);
                        });
                    }
                });
        }
    });
}

/* Function that returns a promise to return a neighborhood
array that includes the postal code and country */
function toNeighborhood(latlng) {
	return new Promise((resolve, reject) => {
        const geocoder = new google.maps.Geocoder;
        geocoder.geocode({"location": latlng}, function(results, status) {
            if (status == "OK") {
                if (results[0]) {
                    const result = results[0]
                    let zipCode = "";
                    let country ="";
                    for (let i = result.address_components.length - 1; i >= 0; i--) {
                        let component = result.address_components[i];
                        if ((zipCode == "") && (component.types.indexOf("postal_code") >= 0 )) {
                            zipCode = component.long_name;
                        }
                        if ((country == "") && (component.types.indexOf("country") >= 0 )) {
                            country = component.long_name;
                        }
                        if (zipCode != "" && country != "") break;
                    }
                    neighborhood = [zipCode, country];
                    resolve([zipCode, country]);
                } else reject("Couldn't get neighborhood");
            } else reject("Couldn't get neighborhood");
        });
    });
}

/* Fetches tasks from servlet by category and cursor action.
   Cursor can pick up from the last start, the endpoint, or clear
   the cursor and start from beginning of query */
function fetchTasks(category, cursorAction) {
    let url = "/tasks?zipcode=" + neighborhood[0]+ "&country=" + neighborhood[1] +"&cursor=" + cursorAction;
    if (category !== undefined && category != "all") {
        url += "&category=" + category;
    }
    return fetch(url).then(response => response.json());
}

/* Displays the tasks received from the server response */
function displayTasks(append) {
    let taskMap = document.getElementById("tasks-map-wrapper");
    let taskList = document.getElementById("tasks-list");

    if (!append) {
        // clears old markers
        markersMap.forEach((marker) => {
            oms.forgetMarker(marker);
            marker.setMap(null);
        });
        markersMap.clear();     
        taskList.innerHTML = "";
    }

    if (taskGroup !== null && taskGroup.currentTaskCount > 0) {
        
        document.getElementById("no-tasks-message").style.display = "none";

        // displays new marker tasks
        taskGroup.tasks.forEach(task => displayTaskMarker(task));

        //displays new listed tasks
        taskGroup.tasks.map(createTaskListNode).forEach(node => taskList.appendChild(node));
        
        addTasksClickHandlers();

        let loadMoreTasksMapControl = document.getElementById("load-more-tasks-control");
        if (currentView === "list") {
            taskList.style.display = "block";
            taskMap.style.display = "none";
            loadMoreTasksMapControl.style.display = "none";
        } else if (currentView === "map") {
            taskMap.style.display = "block";
            taskList.style.display = "none";
            if (taskGroup.endOfQuery) loadMoreTasksMapControl.style.display = "none";
            else loadMoreTasksMapControl.style.display = "block";
        }
    } else {
        if (!append) {
            taskList.innerHTML = "";
            document.getElementById("no-tasks-message").style.display = "block";
            taskList.style.display = "none";
        }
    }
    document.getElementById("loading").style.display = "none";
}

function createTaskListNode(task) {
    let taskDiv = document.createElement("div");
    taskDiv.className = "task";
    taskDiv.setAttribute("data-key", task.keyString);

    if (taskGroup.userLoggedIn == true && task.isOwnerCurrentUser == false) {
        let helpOverlay = document.createElement("div");
        helpOverlay.className = "help-overlay";
        let exitHelp = document.createElement("div");
        exitHelp.className = "exit-help";
        let exitLink = document.createElement("a");
        exitLink.innerText = "×";
        let confirmHelp = document.createElement("a");
        confirmHelp.className = "confirm-help";
        confirmHelp.innerText = "CONFIRM";

        exitHelp.appendChild(exitLink);
        helpOverlay.appendChild(exitHelp);
        helpOverlay.appendChild(confirmHelp);
        taskDiv.appendChild(helpOverlay);
    }

    let taskContainer = document.createElement("div");
    taskContainer.className = "task-container";
    let taskHeader = document.createElement("div");
    taskHeader.className = "task-header";
    let userNickname = document.createElement("div");
    userNickname.className = "user-nickname";
    userNickname.innerText = task.owner;
    taskHeader.appendChild(userNickname);

    if (taskGroup.userLoggedIn == true && task.isOwnerCurrentUser == false) {
        let helpOut = document.createElement("div");
        helpOut.className = "help-out";
        helpOut.innerText = "HELP OUT";
        taskHeader.appendChild(helpOut);
    }

    let taskContent = document.createElement("div");
    taskContent.className = "task-content";
    taskContent.innerText = task.overview;

    let taskFooter = document.createElement("div");
    taskFooter.className = "task-footer";
    let taskCategory = document.createElement("div");
    taskCategory.className = "task-category";
    taskCategory.innerText = "#" + task.category;
    let taskDateTime = document.createElement("div");
    taskDateTime.className = "task-date-time";
    taskDateTime.innerText = task.dateTime;
    taskFooter.appendChild(taskCategory);
    taskFooter.appendChild(taskDateTime);

    taskContainer.appendChild(taskHeader);
    taskContainer.appendChild(taskContent);
    taskContainer.appendChild(taskFooter);

    taskDiv.appendChild(taskContainer);

    return taskDiv;
}

// Loads and displays markers for each task fetched that hasn't been added or claimed already
function displayTaskMarker(task) {
    // only adds task that aren't already loaded in map and that haven't been claimed in the list-view already
    if (!markersMap.has(task.keyString) && !markersToHide.has(task.keyString)) {
        const marker = new google.maps.Marker({
            position: {lat: task.lat, lng: task.lng},
            map: map,
            isCurrentUser: task.isOwnerCurrentUser,
            detail: task.detail,
            overview: task.overview,
            category: task.category,
            owner: task.owner,
            dateTime: task.dateTime,
            key: task.keyString});
        markersMap.set(marker.get("key"), marker);

        const infoWindow = new google.maps.InfoWindow;

        // adds marker click listener to close all other opened infowindows
        // and then open the current marker's infowindow
        marker.addListener("spider_click", () => {
            infoWindows.forEach(infoWindow => {
                    infoWindow.close();
                });
            openInfoWindow(map, marker, infoWindow);
        });
        oms.addMarker(marker);
    }
}

/** Builds and Opens Info Window */
function openInfoWindow(map, marker, infoWindow) {
    const windowNode = document.createElement("div");

    let owner = document.createElement("div");
    owner.innerText = marker.owner;
    owner.className = "user-nickname";
    windowNode.appendChild(owner);

    let overview = document.createElement("div");
    overview.innerText = marker.overview;
    overview.className = "task-content-marker";
    windowNode.appendChild(overview);

    let category = document.createElement("div");
    category.innerText = "#" + marker.category;
    category.className = "task-category";
    windowNode.appendChild(category);

    let dateTime = document.createElement("div");
    dateTime.innerText = marker.dateTime;
    dateTime.className = "task-date-time";
    windowNode.appendChild(dateTime);

    // adds help out option
    if (marker.get("isCurrentUser") == false) {
        const helpOutButton = document.createElement("button");
        helpOutButton.innerText = "Help Out";
        helpOutButton.className = "help-out-marker";

        // adds help out button click event
        helpOutButton.addEventListener("click", function(e) {
            let helpOverlay = document.getElementById("help-overlay-map");
            helpOverlay.style.display = "block";

            // adds confirm help click event
            document.getElementById("confirm-map").addEventListener("click", function(e) {
                confirmHelp(marker.get("key"));
                helpOverlay.style.display = "none";
                e.stopPropagation();
            });

            // adss exit help click event
            document.getElementById("exit-help-map").addEventListener("click", function(e) {
                helpOverlay.style.display = "none";
                e.stopPropagation();
            });
            e.stopPropagation();
        });
        windowNode.appendChild(helpOutButton);
    }

    // adds click even to open up the task details modal
    windowNode.addEventListener("click", function() {
        showTaskInfo(marker.get("key"));
    });
    
    infoWindow.setContent(windowNode);
    infoWindow.open(map, marker);
    infoWindows.push(infoWindow);
}

/* Function adds all the necessary tasks 'click' event listeners*/
function addTasksClickHandlers() {

    // adds confirmHelp click event listener to confirm help buttons
    const confirmHelpButtons = document.getElementsByClassName("confirm-help");
    for (let i = 0; i < confirmHelpButtons.length; i++){
        if (confirmHelpButtons[i].id != "confirm-map") {
            confirmHelpButtons[i].addEventListener("click", function(e) {
                let taskKey = e.target.closest(".task").dataset.key;
                confirmHelp(taskKey);
                e.stopPropagation();
            });
        } 
    }
    // adds exitHelp click event listener to exit help buttons
    const exitHelpButtons = document.getElementsByClassName("exit-help");
    for (let i = 0; i < exitHelpButtons.length; i++) {
        exitHelpButtons[i].addEventListener("click", function(e) {
            exitHelp(e.target);
            e.stopPropagation();
        });
    }

    // adds helpOut click event listener to help out buttons
    const helpOutButtons = document.getElementsByClassName("help-out");
    for (let i = 0; i < helpOutButtons.length; i++) {
        if (!helpOutButtons[i].classList.contains("disable-help")) {
            helpOutButtons[i].addEventListener("click", function(e) {
                helpOut(e.target);
                e.stopPropagation();
            });
        }
    }

    // adds stopPropagation on help overlay to prevent opening task details when clicking on it
    const helpOverlays = document.getElementsByClassName("help-overlay");
    for (let i = 0; i < helpOverlays.length; i++) {
        helpOverlays[i].addEventListener("click", function(e) {
            e.stopPropagation();
        });
    }
    
    // adds task click event listener to open up task details
    const tasks = document.getElementsByClassName("task");
    for (let i = 0; i < tasks.length; i++) {
        tasks[i].addEventListener("click", function(e) {
            let taskElement = e.target;

            // If element clicked was a child element it closest task ancestor instead
            if (taskElement.className != "task") {
                taskElement = taskElement.closest(".task");
            }
            showTaskInfo(taskElement.dataset.key);
        });
    }
}

/* Helper function that determines if the current user's neighborhood is known */
function userNeighborhoodIsKnown() {
  return (neighborhood[0] !== null && neighborhood[1] !== null);
}
