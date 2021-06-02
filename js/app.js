"use strict";

//** ----------- Global Variables ----------- **//
const _characterRef = _db.collection("characters");
const _userRef = _db.collection("users")
let _currentUser;
let _characters;
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

// append characters to the DOM.
function appendCharacters(characters) {
  let htmlTemplate = "";
  let newCharacterTemplate = /*html*/ `
      <article id="create-character-article">
        <a href="#create">
          <section>
          <h2>Create a new Character</h2>
          <img src="img/addCharacter.png">
          <h3>Create a new Character</h3>
          <p>Create</p>
          <section>
        </a>
        <button href="#create">Create a new Character</button>
      </article>
    `;
  for (let character of characters) {
    htmlTemplate += /*html*/ `
      <article>
        <a onclick="selectCharacterId('${character.id}'); appendCharacterSheet('${character.id}')">
        <h2>${character.name}</h2>
        <p class="view-charactersheet-p">Click to view character sheet</p>
        <img src="${character.img || 'img/placeholder.jpg'}">
        <h3>${character.race} <span>${character.primary_class}</span></h3>
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
      <article id="create-character-article">
        <a href="#create">
          <section>
          <h2>Create a new Character</h2>
          <img src="img/addCharacter.png">
          <h3>Create a new Character</h3>
          <p>Create</p>
          <section>
        </a>
        <button href="#create">Create a new Character</button>
      </article>
  `;
  if (ownCharacterIds.length === 0) {
    htmlTemplate = "<p>Claim some characters and they'll show up here!</p>";
  } else {
    for (let characterId of ownCharacterIds) {
      await _characterRef.doc(characterId).get().then(function (doc) {
        let character = doc.data();
        character.id = doc.id;
        //character.collection().data();
        htmlTemplate += /*html*/ `
        <article>
          <a onclick="selectCharacterId('${character.id}'); appendCharacterSheet('${character.id}')">
            <h2>${character.name}</h2>
            <p class="view-charactersheet-p">Click to view character sheet</p>
            <img src="${character.img || 'img/placeholder.jpg'}">
            <h3>${character.race} <span>${character.primary_class}</span></h3>
            <p><span>Campaign: ${character.campaign}</span></p>
          </a>
          <button onclick="removeFromOwnCharacters('${character.id}')" class="rm">Unclaim character</button>
          <button class="update-delete-button" onclick="selectCharacter('${character.id}', '${character.name}', '${character.race}', '${character.primary_class}', '${character.subclass}', '${character.campaign}', '${character.img}')">Update</button>
          <button class="update-delete-button" onclick="deleteCharacter('${character.id}')">Delete</button>
        </article>
      `;
      });
    }
  }
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

// removes a given characterId from the ownCharacters array inside _currentUser
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
  _characterRef.doc(_selectedCharacterId).update(characterToUpdate);
  navigateTo("all_characters");
}

function resetUpdateValues () {
  // reset input values
  let campaignInput = document.querySelector('#campaign-update');
  let nameInput = document.querySelector('#name-update');
  let primaryClassInput = document.querySelector('#primary-class-update');
  let raceInput = document.querySelector('#race-update');
  let subclassInput = document.querySelector('#subclass-update');
  let imageInput = document.querySelector('#image-update');
  campaignInput.value = "";
  nameInput.value = "";
  primaryClassInput.value = "";
  raceInput.value = "";
  subclassInput.value = "";
  imageInput.src = "";
}

// Delete character by ID
function deleteCharacter(id) {
  // Removes character from list of own characters; this is because the 'own characters' page will bug when it sees an id in the ownCharacters array that doesn't correspond with an actual character. Since people are unlikely to claim other people's characters, this should work for most uses.
  removeFromOwnCharacters(id);
  _characterRef.doc(id).delete();
}


// Character sheet functions

// Selects the character's id and inserts it into the global variable
function selectCharacterId(id) {
  // references to the input fields
  _selectedCharacterId = id;
}


// Appends the neccesary parts, plus the Intro section to the character sheet site
// Sets the corresponding active tab in the character sheet
function appendCharacterSheet() {
  // references to the input fields
  appendCharacterSheetTopRow(_selectedCharacterId);
  appendCharacterImg(_selectedCharacterId);
  appendCharacterIntro(_selectedCharacterId);
  resetActiveTabCharacterSheet();
  setActiveTabCharacterSheet();
}

// Swab in the Intro section to the character sheet's section - replaces whatever is in the content-tab article found in the CharacterImg function that's appended before
// Sets the corresponding active tab in the character sheet
function goToIntro() {
  // references to the input fields
  appendCharacterIntro(_selectedCharacterId);
  setActiveTabCharacterSheet();
}

// Swab in the Scores section to the character sheet's section - replaces whatever is in the content-tab article found in the CharacterImg function that's appended before
// Sets the corresponding active tab in the character sheet
function goToScores() {
  // references to the input fields
  appendCharacterScores(_selectedCharacterId);
  setActiveTabCharacterSheet();
}

// Swab in the Combat section to the character sheet's section - replaces whatever is in the content-tab article found in the CharacterImg function that's appended before
// Sets the corresponding active tab in the character sheet
function goToCombat() {
  // references to the input fields
  appendCharacterCombat(_selectedCharacterId);
  setActiveTabCharacterSheet();
}

// Swab in the Spells section to the character sheet's section - replaces whatever is in the content-tab article found in the CharacterImg function that's appended before
// Sets the corresponding active tab in the character sheet
function goToSpells() {
  // references to the input fields
  appendCharacterSpells(_selectedCharacterId);
  setActiveTabCharacterSheet();
}

// Swab in the Abilities section to the character sheet's section - replaces whatever is in the content-tab article found in the CharacterImg function that's appended before
// Sets the corresponding active tab in the character sheet
function goToAbilities() {
  // references to the input fields
  appendCharacterAbilities(_selectedCharacterId);
  setActiveTabCharacterSheet();
}

// Swab in the Equipment section to the character sheet's section - replaces whatever is in the content-tab article found in the CharacterImg function that's appended before
// Sets the corresponding active tab in the character sheet
function goToEquipment() {
  // references to the input fields
  appendCharacterEquipment(_selectedCharacterId);
  setActiveTabCharacterSheet();
}


// append top row of character sheet to the DOM
async function appendCharacterSheetTopRow() {
  let htmlTemplate = "";
  await _characterRef.doc(_selectedCharacterId).get().then(function (doc) {
    let character = doc.data();
    character.id = doc.id;
    htmlTemplate += /*html*/ `
    <div class="column-small-flex-1" id="character-name-bot-margin">
      <h1 id="name-paragraph">${character.name}</h1>
    </div>
    <div class="column-small-flex-1 column-bot-margin">
      <p class="top-descriptor-paragraph" id="tdp-top">${character.race || 'Race'} <span>♦</span> ${character.primary_class || 'Class'} <span>♦</span> ${character.subclass || 'Subclass'}</p>
      <p class="top-descriptor-paragraph" id="tdp-bot">${character.background || 'Background'} <span>♦</span> ${character.alignment || 'Alignment'} <span>♦</span> ${character.archetype || 'Archetype'}</p>
    </div>
    <div class="column-small-flex-2 column-bot-margin">
      <div>
          <p id="level-number">${character.level || '?'}</p>
          <p id="level-word">Level</p>
      </div>
      <div id="diamond1"></div>
      <div id="diamond2"></div>
    </div>
    `;
  });
  document.querySelector('#character-sheet-top-row').innerHTML = htmlTemplate;
}

// append character image to the DOM
async function appendCharacterImg() {
  let htmlTemplate = "";
  await _characterRef.doc(_selectedCharacterId).get().then(function (doc) {
    let character = doc.data();
    character.id = doc.id;
    htmlTemplate += /*html*/ `
    <div class="column-small-flex-2 column-bot-margin">
      <!-- Character portrait -->
      <img id="character-img"
          src="${character.img || 'img/placeholder.jpg'}"
          alt="Character image of ${character.name}">
    </div>

    <div class="column-small-flex-1 column-bot-margin">
      <!-- Content section -->
      <article class="character-content" id="content-tab"></article>
    </div>
    `;
  });
  document.querySelector('#character-sheet-content').innerHTML = htmlTemplate;
}

// append introductory character info to the DOM
async function appendCharacterIntro() {
  let htmlTemplate = "";
  await _characterRef.doc(_selectedCharacterId).get().then(function (doc) {
    let character = doc.data();
    character.id = doc.id;
    htmlTemplate += /*html*/ `
    <!-- Character intro section -->
    <section class="character-sheet-content-tab" id="intro-tab-content">
      <div class="row column-container">
        <div class="column-small-flex-1 descriptor-container">
          <!-- Rows of basic info, separated w. basic lines -->
          <div class="row">
            <div class="column-flex">
              <h4 class="descriptor">Pronouns</h4>
            </div>
            <div class="column-flex">
              <p class="info-p">${character.pronouns || '...'}</p>
            </div>
          </div>

          <hr class="horizontal-line">

          <div class="row">
            <div class="column-flex">
              <h4 class="descriptor">Age</h4>
            </div>
            <div class="column-flex">
              <p class="info-p">${character.age || '...'}</p>
            </div>
          </div>

          <hr class="horizontal-line">

          <div class="row">
            <div class="column-flex">
              <h4 class="descriptor">Birthdate</h4>
            </div>
            <div class="column-flex">
              <p class="info-p">${character.birthdate || '...'}</p>
            </div>
          </div>

          <hr class="horizontal-line">

          <div class="row">
            <div class="column-flex">
              <h4 class="descriptor">Orientation</h4>
            </div>
            <div class="column-flex">
              <p class="info-p">${character.orientation || '...'}</p>
            </div>
          </div>

          <hr class="horizontal-line">

          <div class="row">
            <div class="column-flex">
              <h4 class="descriptor">Relationship status</h4>
            </div>
            <div class="column-flex">
              <p class="info-p">${character.relationship_status || '...'}</p>
            </div>
          </div>

          <hr class="horizontal-line">

          <div class="row">
            <div class="column-flex">
              <h4 class="descriptor">Religion</h4>
            </div>
            <div class="column-flex">
              <p class="info-p">${character.religion || '...'}</p>
            </div>
          </div>

          <hr class="horizontal-line">

          <div class="row">
            <div class="column-flex">
              <h4 class="descriptor">Patron</h4>
            </div>
            <div class="column-flex">
              <p class="info-p">${character.patron || '...'}</p>
            </div>
          </div>

          <hr class="horizontal-line">

          <div class="row">
            <div class="column-flex">
              <h4 class="descriptor">Campaign</h4>
            </div>
            <div class="column-flex">
              <p class="info-p">${character.campaign || '...'}</p>
            </div>
          </div>

          <hr class="horizontal-line">
          
          <p id="three-diamonds">♦ ♦ ♦</p>
          
          <div class="row">
            <div class="column-flex">
              <h4 class="descriptor">Player</h4>
            </div>
            <div class="column-flex">
              <p class="info-p">${character.player_name || '...'}</p>
            </div>
          </div>

          <hr class="horizontal-line">

          <div class="row">
            <div class="column-flex">
              <h4 class="descriptor">Artist</h4>
            </div>
            <div class="column-flex">
              <p class="info-p">${character.artist_name || '...'}</p>
            </div>
          </div>
        </div>

        <div class="column-small-flex-1 content-container">
          <!-- Character's colour scheme -->
          <div class="colour-container">
            <div class="colour" style="background:#${character.colour_scheme1 || '4E4A5B'};"></div>
            <div class="colour" style="background:#${character.colour_scheme2 || '5B586D'};"></div>
            <div class="colour" style="background:#${character.colour_scheme3 || '7A7780'};"></div>
            <div class="colour" style="background:#${character.colour_scheme4 || 'C4BC4F'};"></div>
            <div class="colour" style="background:#${character.colour_scheme5 || 'DCD786'};"></div>
          </div>
          <div class="colour-container">
            <div class="colour" style="background:#${character.colour_scheme6 || 'D7D7D7'};"></div>
            <div class="colour" style="background:#${character.colour_scheme7 || 'C2C2C2'};"></div>
            <div class="colour" style="background:#${character.colour_scheme8 || '8C6D75'};"></div>
            <div class="colour" style="background:#${character.colour_scheme9 || '62494C'};"></div>
            <div class="colour" style="background:#${character.colour_scheme10 || '793A55'};"></div>
          </div>

          <hr class="horizontal-line">
          
          <!-- More character info -->
          <h2 class="character-info">Background</h2>
          <h3 class="character-subinfo">Ideals</h3>
          <div class="character-subinfo-content">
            <p>${character.ideals || '...'}</p>
          </div>
          <h3 class="character-subinfo">Bonds</h3>
          <div class="character-subinfo-content">
            <p>${character.bonds || '...'}</p>
          </div>
          <h3 class="character-subinfo">Flaws</h3>
          <div class="character-subinfo-content">
            <p>${character.flaws || '...'}</p>
          </div>

          <hr class="subheader-horizontal-line">

          <p id="subheader">Story</p>
          <p class="description">${character.story || '...'}</p>
        </div>
      </div>
    </section>
    `;
  });
  document.querySelector('#content-tab').innerHTML = htmlTemplate;
  navigateTo("character-sheet");
}

// append character's ability scores and skills to the DOM
async function appendCharacterScores(_selectedCharacterId) {
  let htmlTemplate = "";
  await _characterRef.doc(_selectedCharacterId).get().then(function (doc) {
    let character = doc.data();
    character.id = doc.id;
    htmlTemplate += /*html*/ `
    <!-- Ability Scores section -->
    <section class="character-sheet-content-tab" id="scores-tab-content">
      <div class="row" id="top-stats">
        <!-- Ability scores, and their corresponding skills -->
        <div class="column-small-flex-1 top-stat-set">
          <!-- Ability score -->
          <div class="ability-score-container-top">
            <p class="ability-score-number">${character.str || '...'}</p>
            <div class="ability-score-box"></div>
          </div>
          <h2 class="ability-and-modifier">
            <span class="ability-and-modifier-span">STR</span>
            <span class="ability-and-modifier-span">+${character.strModifier || '...'}</span>
          </h2>

          <!-- Skills affected by the above ability score -->
          <div class="row">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.athleticsModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Athletics</h3>
            </div>
          </div>
        </div>

        <div class="column-small-flex-1 top-stat-set">
          <div class="ability-score-container-top">
            <p class="ability-score-number">${character.dex || '...'}</p>
            <div class="ability-score-box"></div>
          </div>
          <h2 class="ability-and-modifier">
            <span class="ability-and-modifier-span">DEX</span>
            <span class="ability-and-modifier-span">+${character.dexModifier || '...'}</span>
          </h2>

          <div class="row">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.acrobaticsModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Acrobatics</h3>
            </div>
          </div>

          <div class="row not-top-skill">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.sleightOfHandModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Sleight of Hand</h3>
            </div>
          </div>

          <div class="row not-top-skill">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.stealthModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Stealth</h3>
            </div>
          </div>
        </div>

        <div class="column-small-flex-1 top-stat-set">
          <div class="ability-score-container-top">
            <p class="ability-score-number">${character.con || '...'}</p>
            <div class="ability-score-box"></div>
          </div>
          <h2 class="ability-and-modifier">
            <span class="ability-and-modifier-span">CON</span>
            <span class="ability-and-modifier-span">+${character.conModifier || '...'}</span>
          </h2>
        </div>
      </div>

      <div class="row" id="bot-stats">
        <div class="column-small-flex-1 bot-stat-set">
          <div class="ability-score-container-bot">
            <p class="ability-score-number">${character.int || '...'}</p>
            <div class="ability-score-box"></div>
          </div>
          <h2 class="ability-and-modifier">
            <span class="ability-and-modifier-span">INT</span>
            <span class="ability-and-modifier-span">+${character.intModifier || '...'}</span>
          </h2>

          <div class="row">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.arcanaModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Arcana</h3>
            </div>
          </div>

          <div class="row not-top-skill">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.historyModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">History</h3>
            </div>
          </div>

          <div class="row not-top-skill">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.investigationModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Investigation</h3>
            </div>
          </div>

          <div class="row not-top-skill">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.natureModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Nature</h3>
            </div>
          </div>

          <div class="row not-top-skill">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.religionModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Religion</h3>
            </div>
          </div>
        </div>

        <div class="column-small-flex-1 bot-stat-set">
          <div class="ability-score-container-bot">
            <p class="ability-score-number">${character.wis || '...'}</p>
            <div class="ability-score-box"></div>
          </div>
          <h2 class="ability-and-modifier">
            <span class="ability-and-modifier-span">WIS</span>
            <span class="ability-and-modifier-span">+${character.wisModifier || '...'}</span>
          </h2>

          <div class="row">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.animalHandlingModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Animal Handling</h3>
            </div>
          </div>

          <div class="row not-top-skill">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.insightModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Insight</h3>
            </div>
          </div>

          <div class="row not-top-skill">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.medicineModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Medicine</h3>
            </div>
          </div>

          <div class="row not-top-skill">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.perceptionModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Perception</h3>
            </div>
          </div>

          <div class="row not-top-skill">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.survivalModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Survival</h3>
            </div>
          </div>
        </div>

        <div class="column-small-flex-1 bot-stat-set">
          <div class="ability-score-container-bot">
            <p class="ability-score-number">${character.cha || '...'}</p>
            <div class="ability-score-box"></div>
          </div>
          <h2 class="ability-and-modifier">
            <span class="ability-and-modifier-span">CHA</span>
            <span class="ability-and-modifier-span">+${character.chaModifier || '...'}</span>
          </h2>

          <div class="row">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.deceptionModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Deception</h3>
            </div>
          </div>

          <div class="row not-top-skill">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.intimidationModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Intimidation</h3>
            </div>
          </div>

          <div class="row not-top-skill">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.performanceModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Performance</h3>
            </div>
          </div>

          <div class="row not-top-skill">
            <div class="column skill-modifier">
              <h3 class="skill">+${character.persuasionModifier || '...'}</h3>
            </div>
            <div class="column-flex">
              <h3 class="skill">Persuasion</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
    `;
  });
  document.querySelector('#content-tab').innerHTML = htmlTemplate;
  navigateTo("character-sheet");
}

// append character's combat items to the DOM
async function appendCharacterCombat(_selectedCharacterId) {
  let htmlTemplate = "";
  await _characterRef.doc(_selectedCharacterId).get().then(function (doc) {
    let character = doc.data();
    character.id = doc.id;
    htmlTemplate += /*html*/ `
    <!-- Combat section -->
    <section class="character-sheet-content-tab" id="combat-tab-content">
      <div class="row column-container">
        <div class="column-small-flex-1 content-container">
          <!-- Weapon info. This is temporary due to time constraints - It is meant to be able to load in every weapon a given character has -->
          <div class="weapon">
            <div class="weapon-img-container">
              <img class="weapon-img" src="img/whiteSword.png" alt="weapon">
            </div>
            <div class="row">
              <div class="column-small-flex-1 weapon-name-and-properties">
                Weapon Name
                <p class="weapon-properties">Heavy, two-handed</p>
              </div>
              <div class="column-small-flex-1 weapon-dmg">2d6 slashing + Ability Modifier + Proficiency Bonus</div>
            </div>
            <hr class="weapon-horizontal-line">
            <p class="description">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin molestie dapibus nulla, ut feugiat justo congue eu. Suspendisse fringilla felis id luctus blandit. Sed accumsan elit non luctus facilisis.</p>
          </div>

          <div class="weapon">
              <div class="weapon-img-container">
                  <img class="weapon-img"
                      src="img/whiteSword.png"
                      alt="weapon">
              </div>
              <div class="row">
                  <div class="column-small-flex-1 weapon-name-and-properties">
                      Weapon Name
                      <p class="weapon-properties">Light, thrown (range 20/60)</p>
                  </div>
                  <div class="column-small-flex-1 weapon-dmg">1d6 slashing + Ability Modifier + Proficiency Bonus</div>
              </div>
              <hr class="weapon-horizontal-line">
              <p class="description">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin molestie dapibus nulla, ut feugiat justo congue eu. Suspendisse fringilla felis id luctus blandit. Sed accumsan elit non luctus facilisis.</p>
          </div>

          <div class="weapon">
              <div class="weapon-img-container">
                  <img class="weapon-img"
                      src="img/whiteSword.png"
                      alt="weapon">
              </div>
              <div class="row">
                  <div class="column-small-flex-1 weapon-name-and-properties">
                      Weapon Name
                      <p class="weapon-properties">Finesse, light, thrown (range 20/60)
                      </p>
                  </div>
                  <div class="column-small-flex-1 weapon-dmg">1d4 piercing + Ability Modifier + Proficiency Bonus</div>
              </div>
              <hr class="weapon-horizontal-line">
              <p class="description">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin molestie dapibus nulla, ut feugiat justo congue eu. Suspendisse fringilla felis id luctus blandit. Sed accumsan elit non luctus facilisis.</p>
          </div>
        </div>

        <div class="column-small-flex-2 column-container">
          <!-- Combat related score and their modifier -->
          <div class="ability-score-container-top">
            <p id="ac-number">${character.ac || '...'}</p>
            <div class="ability-score-box"></div>
          </div>
          <p class="passive-ability">
            <span class="ability-and-modifier-span">AC</span>
          </p>

          <div class="ability-score-container-top">
            <p id="initiative-number">+${character.initiative || '...'}</p>
            <div class="passive-ability-number-box"></div>
          </div>
          <p class="passive-ability">
            <span class="ability-and-modifier-span">Initiative</span>
          </p>

          <div class="ability-score-container-top">
            <p class="speed-passive-perception-number">${character.speed || '...'}</p>
            <div class="passive-ability-number-box"></div>
          </div>
          <p class="passive-ability">
            <span class="ability-and-modifier-span">Speed</span>
          </p>

          <div class="ability-score-container-top">
            <p class="speed-passive-perception-number">${character.passive_perception || '...'}</p>
            <div class="passive-ability-number-box"></div>
          </div>
          <p class="passive-ability">
            <span class="ability-and-modifier-span">Passive Perception</span>
          </p>
        </div>
      </div>
    </section>
    `;
  });
  document.querySelector('#content-tab').innerHTML = htmlTemplate;
  navigateTo("character-sheet");
}

// append character's spells to the DOM
async function appendCharacterSpells(_selectedCharacterId) {
  let htmlTemplate = "";
  await _characterRef.doc(_selectedCharacterId).get().then(function (doc) {
    let character = doc.data();
    character.id = doc.id;
    htmlTemplate += /*html*/ `
    <!-- Spell section -->
    <section class="character-sheet-content-tab" id="spells-tab-content">
      <div class="row" id="spell-list-container">
        <div class="column-small-flex-1 column-container">

          <p class="spell-type">Cantrip</p>
          <hr class="spell-type-horizontal-line">

          <div class="spell">
            <p class="spell-name">Eldritch Blast</p>
            <hr class="spell-horizontal-line">
            <p>
                <span class="spell-school">Evocation</span><br>
                <b class="spell-details">Casting Time:</b> 1 action<br>
                <b class="spell-details">Range:</b> 120 feet<br>
                <b class="spell-details">Components:</b> V, S<br>
                <b class="spell-details">Duration:</b> Instantaneous
            </p>
            <hr class="spell-horizontal-line">
            <div class="spell-description">
                <p>
                  A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 force damage. +3 from Agonizing Blast.
                </p>
                <p>
                  The spell creates more than one beam when you reach higher levels: two beams at 5th level, three beams at 11th level, and four beams at 17th level. You can direct the beams at the same target or at different ones. Make a separate attack roll for each beam.
                </p>
            </div>
          </div>

          <div class="spell">
            <p class="spell-name">Prestidigitation</p>
            <hr class="spell-horizontal-line">
            <p>
                <span class="spell-school">Transmutation</span><br>
                <b class="spell-details">Casting Time:</b> 1 action<br>
                <b class="spell-details">Range:</b> 10 feet<br>
                <b class="spell-details">Components:</b> V, S<br>
                <b class="spell-details">Duration:</b> 1 hour
            </p>
            <hr class="spell-horizontal-line">
            <div class="spell-description">
              <p>
                This spell is a minor magical trick that novice spellcasters use for practice. You create one of the following magical effects within range:
              </p>
              <p>
                ♦ You create an instantaneous, harmless sensory effect, such as a shower of sparks, a puff of wind, faint musical notes, or an odd odor.
              </p>
              <p>
                ♦ You instantaneously light or snuff out a candle, a torch, or a small campfire.
              </p>
              <p>
                ♦ You instantaneously clean or soil an object no larger than 1 cubic foot.
              </p>
              <p>
                ♦ You chill, warm, or flavor up to 1 cubic foot of nonliving material for 1 hour.
              </p>
              <p>
                ♦ You make a color, a small mark, or a symbol appear on an object or a surface for 1 hour.
              </p>
              <p>
                ♦ You create a nonmagical trinket or an illusory image that can fit in your hand and that lasts until the end of your next turn.
              </p>
              <p>
                If you cast this spell multiple times, you can have up to three of its non-instantaneous effects active at a time, and you can dismiss such an effect as an action.
              </p>
            </div>
          </div>
        </div>

        <div class="column-small-flex-1 column-container">
          <p class="spell-type">Lvl 1 <span class="diamond">♦</span> 3 slots
          </p>
          <hr class="spell-type-horizontal-line">

          <div class="spell">
            <p class="spell-name">Find Familiar</p>
            <hr class="spell-horizontal-line">
            <p>
              <span class="spell-school">Conjuration</span><br>
              <b class="spell-details">Casting Time:</b> 1 hour<br>
              <b class="spell-details">Range:</b> 10 feet<br>
              <b class="spell-details">Components:</b> V, S, M<br>
              <b class="spell-details">Duration:</b> Instantaneous
            </p>
            <hr class="spell-horizontal-line">
            <div class="spell-description">
              <p>
                You gain the service of a familiar, a spirit that takes an animal form you choose: bat, cat, crab, frog (toad), hawk, lizard, octopus, owl, poisonous snake, fish (quipper), rat, raven, sea horse, spider, or weasel. Appearing in an unoccupied space within range, the familiar has the statistics of the chosen form, though it is a celestial, fey, or fiend (your choice) instead of a beast.
              </p>
              <p>
                Your familiar acts independently of you, but it always obeys your commands. In combat, it rolls its own initiative and acts on its own turn. A familiar can't attack, but it can take other actions as normal.
              </p>
              <p>
                When the familiar drops to 0 hit points, it disappears, leaving behind no physical form. It reappears after you cast this spell again.
              </p>
              <p>
                While your familiar is within 100 feet of you, you can communicate with it telepathically. Additionally, as an action, you can see through your familiar's eyes and hear what it hears until the start of your next turn, gaining the benefits of any special senses that the familiar has. During this time, you are deaf and blind with regard to your own senses.
              </p>
              <p>
                As an action, you can temporarily dismiss your familiar. It disappears into a pocket dimension where it awaits your summons. Alternatively, you can dismiss it forever. As an action while it is temporarily dismissed, you can cause it to reappear in any unoccupied space within 30 feet of you.
              </p>
              <p>
                You can't have more than one familiar at a time. If you cast this spell while you already have a familiar, you instead cause it to adopt a new form. Choose one of the forms from the above list. Your familiar transforms into the chosen creature.
              </p>
              <p>
                Finally, when you cast a spell with a range of touch, your familiar can deliver the spell as if it had cast the spell. Your familiar must be within 100 feet of you, and it must use its reaction to deliver the spell when you cast it. If the spell requires an attack roll, you use your attack modifier for the roll.
              </p>
            </div>
          </div>
          
          <div class="spell">
            <p class="spell-name">Hellish Rebuke</p>
            <hr class="spell-horizontal-line">
            <p>
              <span class="spell-school">Evocation</span><br>
              <b class="spell-details">Casting Time:</b> 1 reaction<br>
              <b class="spell-details">Range:</b> 60 feet<br>
              <b class="spell-details">Components:</b> V, S<br>
              <b class="spell-details">Duration:</b> Instantaneous
            </p>
            <hr class="spell-horizontal-line">
            <div class="spell-description">
              <p>
                You point your finger, and the creature that damaged you is momentarily surrounded by hellish flames. The creature must make a Dexterity saving throw. It takes 2d10 fire damage on a failed save, or half as much damage on a successful one.
              </p>
              <p>
                <b>At Higher Levels.</b> When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d10 for each slot level above 1st.
              </p>
            </div>
          </div>
          <div class="spell">
            <p class="spell-name">Hex</p>
            <hr class="spell-horizontal-line">
            <p>
              <span class="spell-school">Enchantment (concentration)</span><br>
              <b class="spell-details">Casting Time:</b> 1 bonus action<br>
              <b class="spell-details">Range:</b> 90 feet<br>
              <b class="spell-details">Components:</b> V, S, M<br>
              <b class="spell-details">Duration:</b> up to 1 hour
            </p>
            <hr class="spell-horizontal-line">
            <div class="spell-description">
              <p>
                You place a curse on a creature that you can see within range. Until the spell ends, you deal an extra 1d6 necrotic damage to the target whenever you hit it with an attack. Also, choose one ability when you cast the spell. The target has disadvantage on ability checks made with the chosen ability.
              </p>
              <p>
               If the target drops to 0 hit points before this spell ends, you can use a bonus action on a subsequent turn of yours to curse a new creature.
              </p>
              <p>
                A remove curse cast on the target ends this spell early.
              </p>
              <p>
                <b>At Higher Levels.</b> When you cast this spell using a spell slot of 3rd or 4th level, you can maintain your concentration on the spell for up to 8 hours. When you use a spell slot of 5th level or higher, you can maintain your concentration on the spell for up to 24 hours.
              </p>
            </div>
          </div>
        </div>

        <div class="column-small-flex-1 column-container">
          <p class="spell-type">Lvl 2 <span class="diamond">♦</span> 3 slots
          </p>
          <hr class="spell-type-horizontal-line">

          <div class="spell">
            <p class="spell-name">Misty Step</p>
            <hr class="spell-horizontal-line">
            <p>
              <span class="spell-school">Conjuration</span><br>
              <b class="spell-details">Casting Time:</b> 1 bonus action<br>
              <b class="spell-details">Range:</b> Self<br>
              <b class="spell-details">Components:</b> V<br>
              <b class="spell-details">Duration:</b> Instantaneous
            </p>
            <hr class="spell-horizontal-line">
            <div class="spell-description">
              <p>
                Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space that you can see.
              </p>
            </div>
          </div>

          <div class="spell">
            <p class="spell-name">Invisibility</p>
            <hr class="spell-horizontal-line">
            <p>
              <span class="spell-school">Illusion (concentration)</span><br>
              <b class="spell-details">Casting Time:</b> 1 action<br>
              <b class="spell-details">Range:</b> Touch<br>
              <b class="spell-details">Components:</b> V, S, M<br>
              <b class="spell-details">Duration:</b> Up to 1 hour
            </p>
            <hr class="spell-horizontal-line">
            <div class="spell-description">
              <p>
                A creature you touch becomes invisible until the spell ends. Anything the target is wearing or carrying is invisible as long as it is on the target’s person. The spell ends for a target that attacks or casts a spell.
              </p>
              <p>
                <b>At Higher Levels.</b> When you cast this spell using a spell slot of 3rd level or higher, you can target one additional creature for each slot level above 2nd.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
    `;
  });
  document.querySelector('#content-tab').innerHTML = htmlTemplate;
  navigateTo("character-sheet");
}

// append character's abilities to the DOM
async function appendCharacterAbilities(_selectedCharacterId) {
  let htmlTemplate = "";
  await _characterRef.doc(_selectedCharacterId).get().then(function (doc) {
    let character = doc.data();
    character.id = doc.id;
    htmlTemplate += /*html*/ `
    <!-- Abilities section -->
    <section class="character-sheet-content-tab" id="abilities-tab-content">
      <div class="row column-container">
        <div class="column-small-flex-1 column-container">
          <!-- Background section -->
          <h2 class="character-info">Background</h2>
          <hr class="horizontal-line">

          <div class="subinfo-collection subinfo-collection-top">
            <h3 class="character-subinfo">Wallflower</h3>
            <div class="character-subinfo-content">
              <p>
                You go unnoticed by most people and blend into the crowd. People who have met you have a hard time recalling any defining features. Humanoids have a -3 to their passive perception in regards to you. 
              </p>
            </div>
          </div>

          <!-- Proficiency section -->
          <h2 class="character-info">Proficiency</h2>
          <hr class="horizontal-line">

          <div class="subinfo-collection">
            <h3 class="character-subinfo">Armor</h3>
            <div class="character-subinfo-content">
              <p>Light armor.</p>
            </div>
            <h3 class="character-subinfo">Weapons</h3>
            <div class="character-subinfo-content">
              <p>Simple weapons.</p>
            </div>
            <h3 class="character-subinfo">Tools</h3>
            <div class="character-subinfo-content">
              <p>Cook's Utensils, Dice Set, Playing Card Set.</p>
            </div>
            <h3 class="character-subinfo">Saving Throws</h3>
            <div class="character-subinfo-content">
              <p>Wisdom, Charisma.</p>
            </div>
            <h3 class="character-subinfo">Skills</h3>
            <div class="character-subinfo-content">
              <p>History, Insight, Medicine, Persuasion, and Religion.</p>
            </div>
          </div>
        </div>

        <div class="column-small-flex-1 column-container">
          <!-- Race section -->
          <h2 class="character-info">Kenku</h2>
          <hr class="horizontal-line">

          <div class="subinfo-collection subinfo-collection-top">
            <h3 class="character-subinfo">Expert Forgery</h3>
            <div class="character-subinfo-content">
              <p>
                You can duplicate other creatures' handwriting and craftwork. You have advantage on all checks made to produce forgeries or duplicates of existing objects.
              </p>
            </div>
            <h3 class="character-subinfo">Mimicry</h3>
            <div class="character-subinfo-content">
              <p>
                You can mimic sounds you have heard, including voices. A creature that hears the sounds you make can tell they are imitations with a successful Wisdom (Insight) check opposed by your Charisma (Deception) check.
              </p>
            </div>
          </div>

          <!-- Class section -->
          <h2 class="character-info">Pact of the Chain Warlock</h2>
          <hr class="horizontal-line">
          <div class="subinfo-collection">
            <h3 class="character-subinfo">Otherworldly Patron</h3>
            <div class="character-subinfo-content">
              <p>
                At 1st level, you have struck a bargain with an otherworldly being of your choice, such as The Fiend, which is detailed at the end of the class description. Your choice grants you features at 1st level and again at 6th, 10th, and 14th level.
              </p>
            </div>
            <h3 class="character-subinfo">Dark One's Blessing</h3>
            <div class="character-subinfo-content">
              <p>
                When you reduce a hostile creature to 0 HP, you gain 6 temp HP.
              </p>
              <p>
                When you cast the spell, you can choose one of the normal forms for your familiar or one of the following Special forms: imp, Pseudodragon, Quasit, or Sprite.
              </p>
              <p>
                Additionally, when you take the Attack action, you can forgo one of your own attacks to allow your familiar to make one Attack of its own with its Reaction.
              </p>
            </div>
            <h3 class="character-subinfo">Eldritch Invocations</h3>
            <div class="character-subinfo-content">
              <p>
                In your study of occult lore, you have unearthed Eldritch Invocations, fragments of forbidden knowledge that imbue you with an abiding magical ability.
              </p>
              <p>
                <b>Agonizing Blast:</b> When you cast Eldritch Blast, add +3 to the damage it deals on a hit
              </p>
              <p>
                <b>Voice of the Chain Master:</b> You can communicate telepathically with your familiar, perceive through its senses, and speak through it in your own voice as long as you are on the same plane of existence
              </p>
            </div>
            <h3 class="character-subinfo">Pact Boon: Pact of the Chain</h3>
            <div class="character-subinfo-content">
              <p>
                You learn the Find Familiar spell and can cast it as a ritual. The spell doesn’t count against your number of Spells known.
              </p>
              <p>
                When you cast the spell, you can choose one of the normal forms for your familiar or one of the following Special forms: imp, Pseudodragon, Quasit, or Sprite.
              </p>
              <p>
                Additionally, when you take the Attack action, you can forgo one of your own attacks to allow your familiar to make one Attack of its own with its Reaction.
              </p>
            </div>
            
          </div>
        </div>
      </div>
    </section>
    `;
  });
  document.querySelector('#content-tab').innerHTML = htmlTemplate;
  navigateTo("character-sheet");
}

// append character's equipment to the DOM
async function appendCharacterEquipment(_selectedCharacterId) {
  let htmlTemplate = "";
  await _characterRef.doc(_selectedCharacterId).get().then(function (doc) {
    let character = doc.data();
    character.id = doc.id;
    htmlTemplate += /*html*/ `
    <!-- Equipment section -->
    <section class="character-sheet-content-tab" id="equipment-tab-content">
      <div class="row column-container">
        <div class="column-small-flex-1 column-container">
          <h2 class="character-info">Carried Gear</h2>

          <hr class="horizontal-line">

          <!-- All carried items, with the amount and name. Meant to be able to click it and show description of the item -->
          <div id="items-container">
            <div class="row item">
              <div class="column">1</div>
              <div class="column-flex item-name-container">
                <p>Item Name</p>
              </div>
            </div>

            <hr class="horizontal-line">

            <div class="row item">
              <div class="column">5</div>
              <div class="column-flex item-name-container">
                <p>Item Name</p>
              </div>
            </div>

            <hr class="horizontal-line">

            <div class="row item">
              <div class="column">20</div>
              <div class="column-flex item-name-container">
                <p>Item Name</p>
              </div>
            </div>

            <hr class="horizontal-line">

            <!-- Example of an item with its description showing -->
            <div class="row open-item">
              <div class="column">1</div>
              <div class="column-flex item-name-container">
                <p>Item Name</p>
              </div>
            </div>
            <p class="text-block">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin molestie dapibus nulla, ut feugiat justo congue eu. Suspendisse fringilla felis id luctus blandit. Sed accumsan elit non luctus facilisis.
            </p>

            <hr class="horizontal-line">

            <div class="row item">
              <div class="column">3</div>
              <div class="column-flex item-name-container">
                <p>Item Name</p>
              </div>
            </div>

            <hr class="horizontal-line">

            <div class="row item">
              <div class="column">40</div>
              <div class="column-flex item-name-container">
                <p>Item Name</p>
              </div>
            </div>

            <hr class="horizontal-line">

            <div class="row open-item">
              <div class="column">1</div>
              <div class="column-flex item-name-container">
                <p>Item Name</p>
              </div>
            </div>
            <p class="text-block">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin molestie dapibus nulla, ut feugiat justo congue eu. Suspendisse fringilla felis id luctus blandit. Sed accumsan elit non luctus facilisis.
            </p>

            <hr class="horizontal-line">

            <div class="row item">
              <div class="column">40</div>
              <div class="column-flex item-name-container">
                <p>Item Name</p>
              </div>
            </div>
            <hr class="horizontal-line">
          </div>
        </div>

        <div class="column-small-flex-1 column-container">
          <!-- Coins and their amount -->
          <div id="coin-container">
            <p id="coins-p">Coins</p>

            <hr class="spell-horizontal-line">

            <div class="row coin-type-container-not-last">
              <div class="column"><span class="coin-amount">300</span></div>
              <div class="column-flex item-name-container">
                <p>copper pieces</p>
              </div>
            </div>

            <div class="row coin-type-container-not-last">
              <div class="column"><span class="coin-amount">550</span></div>
              <div class="column-flex item-name-container">
                <p>silver pieces</p>
              </div>
            </div>

            <div class="row coin-type-container-not-last">
              <div class="column"><span class="coin-amount">50</span></div>
              <div class="column-flex item-name-container">
                <p>gold pieces</p>
              </div>
            </div>

            <div class="row">
              <div class="column"><span class="coin-amount">10</span></div>
              <div class="column-flex item-name-container">
                <p>platinum pieces</p>
              </div>
            </div>
          </div>

          <!-- Magic items, similar to the items list except description is always shown -->
          <h2 class="character-info" id="magic-items">Magic Items</h2>

          <hr class="horizontal-line">

          <div id="magic-items-container">
            <h3 class="character-subinfo">Item Name</h3>
            <div class="character-subinfo-content">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin molestie dapibus nulla, ut feugiat justo congue eu. Suspendisse fringilla felis id luctus blandit. Sed accumsan elit non luctus facilisis. Nunc semper neque ut orci bibendum accumsan. Mauris vehicula enim aliquam, mattis mi id, suscipit justo.
              </p>
            </div>

            <h3 class="character-subinfo">Item Name</h3>
            <div class="character-subinfo-content">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin molestie dapibus nulla, ut feugiat justo congue eu. Suspendisse fringilla felis id luctus blandit. Sed accumsan elit non luctus facilisis. Nunc semper neque ut orci bibendum accumsan. Mauris vehicula enim aliquam, mattis mi id, suscipit justo.
              </p>
            </div>

            <h3 class="character-subinfo">Item Name</h3>
            <div class="character-subinfo-content">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin molestie dapibus nulla, ut feugiat justo congue eu. Suspendisse fringilla felis id luctus blandit. Sed accumsan elit non luctus facilisis. Nunc semper neque ut orci bibendum accumsan. Mauris vehicula enim aliquam, mattis mi id, suscipit justo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
    `;
  });
  document.querySelector('#content-tab').innerHTML = htmlTemplate;
  navigateTo("character-sheet");
}
