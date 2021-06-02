"use strict";

// hide all pages
function hideAllPages() {
  let pages = document.querySelectorAll(".page");
  for (let page of pages) {
    page.style.display = "none";
  }
}

// show page or tab
function showPage(pageId) {
  hideAllPages();
  document.querySelector(`#${pageId}`).style.display = "block";
  setActiveTab(pageId);
}

// sets active tabbar/ menu item
function setActiveTab(pageId) {
  let pages = document.querySelectorAll(".tabbar a");
  for (let page of pages) {
    if (`#${pageId}` === page.getAttribute("href")) {
      page.classList.add("active");
    } else {
      page.classList.remove("active");
    }
  }
}

// navigate to a new view/page by changing href
function navigateTo(pageId) {
  location.href = `#${pageId}`;
}

// set default page or given page by the hash url
// function is called 'onhashchange'
function pageChange() {
  let page = "all_characters";
  if (location.hash) {
    page = location.hash.slice(1);
  }
  showPage(page);
}

pageChange(); // called by default when the app is loaded for the first time

function showLoader(show) {
  let loader = document.querySelector('#loader');
  if (show) {
    loader.classList.remove("hide");
  } else {
    loader.classList.add("hide");
  }
}

// Functionality for charactersheet page

// sets active tabbar/ menu item
function setActiveTabCharacterSheet() {
  // Get the container element
  let navContainer = document.getElementById("nav-list");

  // Get all buttons with class="btn" inside the container
  let navLinks = navContainer.getElementsByClassName("nav-link");

  // Loop through the buttons and add the active class to the current/clicked button
  for (let i = 0; i < navLinks.length; i++) {
    navLinks[i].addEventListener("click", function() {
    let current = document.getElementsByClassName("active-nav");
    current[0].className = current[0].className.replace(" active-nav", "");
    // Add the active class to the current/clicked button
    this.className += " active-nav";
    });
  }
}

// resets active tabbar when you next enter a charactersheet
function resetActiveTabCharacterSheet() {
  let current = document.getElementsByClassName("active-nav");
  let nav_intro = document.getElementById("intro-tab");

  current[0].className = current[0].className.replace(" active-nav", "");
  nav_intro.className += " active-nav";
}