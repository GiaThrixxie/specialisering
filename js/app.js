"use strict";

//** ----------- Global Variables ----------- **//
const _characterRef = _db.collection("characters");
const _userRef = _db.collection("users")
let _currentUser;
let _characters; //**//**//**//**//**//**//**//**//**//**//**//**//**//
let _selectedCharacterId = "";

//** ----------- Firebase Auth ----------- **//
// Listen on authentication state change
firebase.auth().onAuthStateChanged(function (user) {
  if (user) { // if user exists and is authenticated
    userAuthenticated(user);
  } else { // if user is not logged in
    userNotAuthenticated();
  }
});

function userAuthenticated(user) {
  _currentUser = user;
  hideTabbar(false);
  init();
  showLoader(false);
}

function userNotAuthenticated() {
  _currentUser = null; // reset _currentUser
  hideTabbar(true);
  showPage("login");

  // Firebase UI configuration
  const uiConfig = {
    credentialHelper: firebaseui.auth.CredentialHelper.NONE,
    signInOptions: [
      firebase.auth.EmailAuthProvider.PROVIDER_ID,
      firebase.auth.GoogleAuthProvider.PROVIDER_ID
    ],
    signInSuccessUrl: '#all_characters'
  };
  // Init Firebase UI Authentication
  const ui = new firebaseui.auth.AuthUI(firebase.auth());
  ui.start('#firebaseui-auth-container', uiConfig);
  showLoader(false);
}

// show and hide tabbar
function hideTabbar(hide) {
  let tabbar = document.querySelector('#tabbar');
  if (hide) {
    tabbar.classList.add("hide");
  } else {
    tabbar.classList.remove("hide");
  }
}

// sign out user
function logout() {
  firebase.auth().signOut();
  // reset input fields
  document.querySelector('#name').value = "";
  document.querySelector('#mail').value = "";
  document.querySelector('#imagePreview').src = "";
}

///** ----------- Profile Page functionality ----------- **//
// append user data to profile page
function appendUserData() {
  document.querySelector('#name').value = _currentUser.displayName;
  document.querySelector('#mail').value = _currentUser.email;
  document.querySelector('#imagePreview').src = _currentUser.img;
}

// update user data - auth user and database object
function updateUser() {
  let user = firebase.auth().currentUser;

  // update auth user
  user.updateProfile({
    displayName: document.querySelector('#name').value
  });

  // update database user
  _userRef.doc(_currentUser.uid).set({
    img: document.querySelector('#imagePreview').src,
  }, {
    merge: true
  });
}

//** ----------- Preview Image functionality ----------- **//
function previewImage(file, previewId) {
  if (file) {
    let reader = new FileReader();
    reader.onload = function (event) {
      document.querySelector('#' + previewId).setAttribute('src', event.target.result);
    };
    reader.readAsDataURL(file);
  }
}

//** ----------- Character functionality ----------- **//

// initialize character references - all characters and user's favourite characters
function init() {
  // init user data and favourite characters
  _userRef.doc(_currentUser.uid).onSnapshot({
    includeMetadataChanges: true
  }, function (userData) {
    if (!userData.metadata.hasPendingWrites && userData.data()) {
      _currentUser = {
        ...firebase.auth().currentUser,
        ...userData.data()
      }; //concating two objects: authUser object and userData objec from the db
      appendUserData();
      appendOwnCharacters(_currentUser.ownCharacters);
      if (_characters) {
        appendCharacters(_characters); // refresh characters when user data changes
      }
      showLoader(false);
    }
  });

  // init all characters
  _characterRef.orderBy("name").onSnapshot(snapshotData => {
    _characters = [];
    snapshotData.forEach(doc => {
      let character = doc.data();
      character.id = doc.id;
      _characters.push(character);
    });
    appendCharacters(_characters);
  });
}

// append characters to the DOM NOTE: The a-tag leads to a TEMPORARY destination. Point is to click it and have it lead to that character's character sheet eventually.
function appendCharacters(characters) {
  let htmlTemplate = "";
  let newCharacterTemplate = /*html*/ `
      <article>
        <a href="#create">
          <h2>Create a new Character</h2>
          <img src="img/placeholder.jpg">
        </a>
      </article>
    `;
  for (let character of characters) {
    htmlTemplate += /*html*/ `
      <article>
      <a href="#profile">
        <h2>${character.name}</h2>
        <img src="${character.img || 'img/placeholder.jpg'}">
        <h3>${character.race} ${character.primary_class} - ${character.subclass}</h3>
        <p>Campaign: ${character.campaign}</p>
        </a>
        ${generateOwnCharactersButton(character.id)}
      </article>
    `;
  }
  document.querySelector('#all-characters-container').innerHTML = newCharacterTemplate + htmlTemplate;
}

function generateOwnCharactersButton(characterId) {
  let btnTemplate = /*html*/ `
    <button onclick="addToOwnCharacters('${characterId}')">Claim character</button>`;
  if (_currentUser.ownCharacters && _currentUser.ownCharacters.includes(characterId)) {
    btnTemplate = /*html*/ `
      <button onclick="removeFromOwnCharacters('${characterId}')" class="rm">Unclaim character</button>`;
  }
  return btnTemplate;
}

// append own characters to the DOM
async function appendOwnCharacters(ownCharacterIds = []) {
  let htmlTemplate = "";
  let newCharacterTemplate = /*html*/ `
  <article>
    <a href="#create">
      <h2>Create a new Character</h2>
      <img src="img/placeholder.jpg">
    </a>
  </article>
  `;
  if (ownCharacterIds.length === 0) {
    htmlTemplate = "<p>Claim some characters and they'll show up here!</p>";
  } else {
    for (let characterId of ownCharacterIds) {
      await _characterRef.doc(characterId).get().then(function (doc) {
        let character = doc.data();
        character.id = doc.id;
        htmlTemplate += /*html*/ `
        <article>
          <a href="#profile">
            <h2>${character.name}</h2>
            <img src="${character.img || 'img/placeholder.jpg'}">
            <h3>${character.race} ${character.primary_class} - ${character.subclass}</h3>
            <p>Campaign: ${character.campaign}</p>
          </a>
          <button onclick="removeFromOwnCharacters('${character.id}')" class="rm">Unclaim character</button>
          <button class="update-delete-button" onclick="selectCharacter('${character.id}', '${character.name}', '${character.race}', '${character.primary_class}', '${character.subclass}', '${character.campaign}', '${character.img}')">Update</button>
          <button class="update-delete-button" onclick="deleteCharacter('${character.id}')">Delete</button>
        </article>
      `;
      });
    }
  }
  console.log(htmlTemplate);
  document.querySelector('#own-characters-container').innerHTML = newCharacterTemplate + htmlTemplate;
}

// adds a given characterId to the ownCharacters array inside _currentUser
function addToOwnCharacters(characterId) {
  showLoader(true);
  _userRef.doc(_currentUser.uid).set({
    ownCharacters: firebase.firestore.FieldValue.arrayUnion(characterId)
  }, {
    merge: true
  });
}

// removes a given characterId to the ownCharacters array inside _currentUser
function removeFromOwnCharacters(characterId) {
  showLoader(true);
  _userRef.doc(_currentUser.uid).update({
    ownCharacters: firebase.firestore.FieldValue.arrayRemove(characterId)
  });
}

// creates a new character object and adds to firestore collection
function createCharacter() {
  let inputCampaign = document.getElementById("campaign");
  let inputImageURL = document.getElementById("imageUrl");
  let inputName = document.getElementById("name");
  let inputPrimaryClass = document.getElementById("primary_class");
  let inputRace = document.getElementById("race");
  let inputSubclass = document.getElementById("subclass");


  let newCharacter = {
    campaign: inputCampaign.value,
    img: inputImageURL.value,
    name: inputName.value,
    primary_class: inputPrimaryClass.value,
    race: inputRace.value,
    subclass: inputSubclass.value
  }
  // add to character ref
  _characterRef.add(newCharacter);

  //navigate to home
  navigateTo("all_characters");

  // reset input values
  inputCampaign.value = "";
  inputImageURL.value = "";
  inputName.value = "";
  inputPrimaryClass.value = "";
  inputRace.value = "";
  inputSubclass.value = "";
}

// Update character
function selectCharacter(id, name, race, primary_class, subclass, campaign, img) {
  // references to the input fields
  let campaignInput = document.querySelector('#campaign-update');
  let nameInput = document.querySelector('#name-update');
  let primaryClassInput = document.querySelector('#primary-class-update');
  let raceInput = document.querySelector('#race-update');
  let subclassInput = document.querySelector('#subclass-update');
  let imageInput = document.querySelector('#image-update');

  campaignInput.value = campaign;
  nameInput.value = name;
  primaryClassInput.value = primary_class;
  raceInput.value = race;
  subclassInput.value = subclass;
  imageInput.src = img;
  _selectedCharacterId = id;

  navigateTo("edit");
}

function updateCharacter() {
  let campaignInput = document.querySelector('#campaign-update');
  let nameInput = document.querySelector('#name-update');
  let primaryClassInput = document.querySelector('#primary-class-update');
  let raceInput = document.querySelector('#race-update');
  let subclassInput = document.querySelector('#subclass-update');
  let imageInput = document.querySelector('#image-update');

  let characterToUpdate = {
    campaign: campaignInput.value,
    name: nameInput.value,
    primary_class: primaryClassInput.value,
    race: raceInput.value,
    subclass: subclassInput.value,
    img: imageInput.src
  };
  _userRef.doc(_selectedCharacterId).update(characterToUpdate);
  navigateTo("all_characters");
}


// Delete character by ID
function deleteCharacter(id) {
  _characterRef.doc(id).delete();
}

