
//** ----------- Firebase configuration ----------- **//
const firebaseConfig = {
  apiKey: "AIzaSyDhjtjgQXKnDISUwoYW5v4SWtMmGLHsvag",
  authDomain: "dnd-database-f3610.firebaseapp.com",
  projectId: "dnd-database-f3610",
  storageBucket: "dnd-database-f3610.appspot.com",
  messagingSenderId: "440751452941",
  appId: "1:440751452941:web:16c6db290365d7525ff644"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
let _firebaseUI;

// Global Variables
const _db = firebase.firestore();
const _campaignRef = _db.collection("campaigns");
//const _characterRef = _db.collectionGroup("characters");
//const _playerRef = _db.collectionGroup("player");
const _characterRef = _db.collection("characters");
const _userRef = _db.collection("users");
let _currentUser;
let _characters;




//** ----------- Firebase Auth ----------- **//
// Listen on authentication state change
firebase.auth().onAuthStateChanged(function (user) {
  if (user) { // If user exists and is authenticated
    userAuthenticated(user);
  } else { // If user is not logged in
    userNotAuthenticated();
  }
});

function userAuthenticated(user) {
  _currentUser = user;
  //appendUserData(user);
  hideTabbar(false);
  init();
  showLoader(false);
}

function userNotAuthenticated() {
  _currentUser = null; // reset the _currentUser global variable
  hideTabbar(true);
  showPage("login");

  // Firebase UI configuration
  const uiConfig = {
    credentialHelper: firebaseui.auth.CredentialHelper.NONE,
    signInOptions: [
      firebase.auth.EmailAuthProvider.PROVIDER_ID//,
      //firebase.auth.GoogleAuthProvider.PROVIDER_ID
    ],
    signInSuccessUrl: '#profile'
  };
  // Init Firebase UI Authentication
  if (!_firebaseUI) {
    _firebaseUI = new firebaseui.auth.AuthUI(firebase.auth());
  }
  _firebaseUI.start('#firebaseui-auth-container', uiConfig);
  showLoader(false);
}




//** ----------- Google Auth ----------- **//
var provider = new firebase.auth.GoogleAuthProvider();

firebase.auth().signInWithRedirect(provider);

firebase.auth()
  .getRedirectResult()
  .then((result) => {
    if (result.credential) {
      /** @type {firebase.auth.OAuthCredential} */
      var credential = result.credential;

      // This gives you a Google Access Token. You can use it to access the Google API.
      var token = credential.accessToken;
      // ...
    }
    // The signed-in user info.
    var user = result.user;
  }).catch((error) => {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    // The email of the user's account used.
    var email = error.email;
    // The firebase.auth.AuthCredential type that was used.
    var credential = error.credential;
    // ...
  });


// Show and hide tabbar
function hideTabbar(hide) {
  let tabbar = document.querySelector('#tabbar');
  if (hide) {
    tabbar.classList.add("hide");
  } else {
    tabbar.classList.remove("hide");
  }
}

// Sign out the user
function logout() {
  firebase.auth().signOut();
  document.querySelector('#name').value = "";
  document.querySelector('#mail').value = "";
  document.querySelector('#imagePreview').src = "";
}




//** ----------- Profile Page ----------- **//
// Append user data to profile page
function appendUserData() {
  document.querySelector('#name').value = _currentUser.displayName;
  document.querySelector('#mail').value = _currentUser.email;
  document.querySelector('#imagePreview').src = _currentUser.img;
}

/*function appendUserData(user) {
  console.log(user);
  document.querySelector('#user-data').innerHTML = `
    <img class="profile-img" src="${user.photoURL || "img/placeholder.jpg"}">
    <h3>Hello ${user.displayName}!</h3>
    <p>Here are your current characters!</p>
    <a class="right" href="#create">Add a character</a>
  `;
}*/

// Update user data - auth user and database object
function updateUser() {
  let user = firebase.auth().currentUser;

  // Update auth user
  user.updateProfile({
    displayName: document.querySelector('#name').value
  });

  // Update database user
  _userRef.doc(_currentUser.uid).set({
    img: document.querySelector('#imagePreview').src
  }, {
    merge: true
  });
}




//** ----------- Profile Page ----------- **//

// Preview Image functionality
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
// Initialize character references - all characters and user's own characters
function init() {
  // init user data and own characters
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
        appendCharacters(_characters); // refresh characters whenever user data changes
      }
      showLoader(false);
    }
  });

  // Init all characters
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

// Append characters to the DOM. NOTE: The a-tag leads to a TEMPORARY destination. Point is to click it and have it lead to that character's character sheet eventually.
function appendCharacters(characters) {
  let htmlTemplate = "";
  for (let character of characters) {
    htmlTemplate +=  `
      <article>
      <a href="#profile">
        <h2>${character.name}</h2>
        <img src="${character.img || 'img/placeholder.jpg'}">
        <h3>${character.race} ${character.primary_class}</h3>
        <p>Campaign: ${character.campaign}</p>
        </a>
        ${generateOwnCharacterButton(character.id)}
      </article>
    `;
  }
  document.querySelector('#all-characters-container').innerHTML = htmlTemplate;
}

// Claim character button and functionality
function generateOwnCharacterButton(characterID) {
  let btnTemplate = `
    <button onclick="addToOwnCharacters('${characterID}')">Claim character</button>`;
  if (_currentUser.ownCharacters && _currentUser.ownCharacters.includes(characterID)) {
    btnTemplate = `
      <button onclick="removeFromOwnCharacters('${characterID}')" class="rm">Unclaim character</button>`;
  }
  return btnTemplate;
}

async function appendOwnCharacters(ownCharacterIDs = []){
  let htmlTemplate = "";
  if(ownCharacterIDs.length === 0) {
    htmlTemplate = "<p>Claim some characters, and they'll show up here!</p>";
  } else {
    for (let characterID of ownCharacterIDs) {
      await _characterRef.doc(characterID).get().then(function (doc) {
        let character = doc.data();
        character.id = doc.id;
        htmlTemplate += `
        <article>
          <a href="#profile">
            <h2>${character.name}</h2>
            <img src="${character.img || 'img/placeholder.jpg'}">
            <h3>${character.race} ${character.primary_class}</h3>
            <p>Campaign: ${character.campaign}</p>
          </a>
          <button onclick="removeFromOwnCharacters('${character.id}')" class="rm">Unclaim character</button>
        </article>
      `;
      });
    }
  }
  document.querySelector('#my-characters-container').innerHTML = htmlTemplate;
}

// Adds a given characterID to the ownCharacters array inside of _currentUser
function addToOwnCharacters(characterID) {
  showLoader(true);
  _userRef.doc(_currentUser.uid).set({
    ownCharacters: firebase.firestore.FieldValue.arrayUnion(characterID)
  }, {
    merge: true
  });
}

// Removes a given characterID from the ownCharacters array inside of _currentUser
function removeFromFavourites(characterID) {
  showLoader(true);
  _userRef.doc(_currentUser.uid).update({
    ownCharacters: firebase.firestore.FieldValue.arrayRemove(characterID)
  });
}

// Create a new character object and add it to the Firestore Collection
function creatCharacter() {
  let inputCampaign = document.getElementById("campaign");
  let inputImageURL = document.getElementById("img");
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

  // Add to character ref
  _characterRef.add(newCharacter);

  //navigate to home
  navigateTo("profile");

  // Reset input values
  inputCampaign.value = "";
  inputImageURL.value = "";
  inputName.value = "";
  inputPrimaryClass.value = "";
  inputRace.value = "";
  inputSubclass.value = "";
}

// watch the database ref for changes
/*_userRef.onSnapshot(function (snapshotData) {
  let users = [];
  snapshotData.forEach(function (doc) {
    let user = doc.data();
    user.id = doc.id;
    users.push(user);
  });
  appendUsers(users);
});


function appendUsers(users) {
  let htmlTemplate = "";
  for (let user of users) {
    htmlTemplate += `
      <article>
        <h2>${user.name}</h2>
        <img src="${user.img || 'img/placeholder.jpg'}">
        <p><a href="mailto:${user.mail}">${user.mail}</a></p>
        <button onclick="selectUser('${user.id}','${user.name}', '${user.mail}', '${user.img}')">Update</button>
        <button onclick="deleteUser('${user.id}')">Delete</button>
      </article>
      `;
  } 
  document.querySelector('#user-container').innerHTML = htmlTemplate;
}*/

// ========== READ ==========


// Append ALL players ( Characters page ) TEST
/*_playerRef.onSnapshot(function (snapshotData) {
  let players = [];
  snapshotData.forEach(function (doc) {
    let player = doc.data();
    player.id = doc.id;
    players.push(player);
  });
  appendAllPlayers(players);
});

function appendAllPlayers(players) {
  let htmlTemplate = "";
  for (let player of players) {
    htmlTemplate += `
    <article>
      <a href="#profile">
        <h2>${player.playerName}</h2>
      </a>
    </article>
    `;
  }
  document.querySelector('#all-characters-container').innerHTML = htmlTemplate;
}*/

// Append ALL characters ( Characters page )
/*let _players = [];
_playerRef.onSnapshot(function (snapshotData) {
  snapshotData.forEach(function (doc) {
    let player = doc.data();
    playerID = doc.id;
    _players.push(player);
  });
  console.log(_players);
});
*/

//** ----------- Read ----------- **//

// 'Fetch' everything from any category called 'characters' (thanks to the global variable) and push into an empty array. Call append function
/*_characterRef.onSnapshot(function (snapshotData) {
  let characters = [];
  snapshotData.forEach(function (doc) {
    let character = doc.data();
    character.id = doc.id;
    characters.push(character);
  });
  appendAllCharacters(characters);
});

// Append all characters across all campaigns to "Characters" page
function appendAllCharacters(characters) {
  let htmlTemplate = "";
  for (let character of characters) {
    htmlTemplate += `
    <article>
      <a href="#profile">
        <h2>${character.name}</h2>
        <img src="${character.img || 'img/placeholder.jpg'}">
        <h3>${character.race} ${character.primary_class}</h3>
        <p>Campaign: ${character.campaign}</p>
        <p>Player:${character.playerName}</p>
      </a>
    </article>
    `;
  }
  document.querySelector('#all-characters-container').innerHTML = htmlTemplate;
}*/

// Append persons OWN characters ( My Profile page )
var ownCharacters = _characterRef.where("playerID", "==", "${_userRef.doc(_currentUser.uid)}"); // FIND OUT HOW TO GET USER'S ID
ownCharacters.onSnapshot(function (snapshotData) {
  let characters = [];
  snapshotData.forEach(function (doc) {
    let character = doc.data();
    character.id = doc.id;
    characters.push(character);
  });
  appendMyCharacters(characters);
});

function appendMyCharacters(characters) {
  let htmlTemplate = "";
  for (let character of characters) {
    htmlTemplate += `
    <article>
      <h2>${character.name}</h2>
      <img src="${character.img || 'img/placeholder.jpg'}">
      <h3>${character.race} ${character.primary_class}</h3>
      <p>Campaign: ${character.campaign}</p>
    </article>
    `;
  }
  document.querySelector('#my-profile-container').innerHTML = htmlTemplate;
}


// ========== CREATE ==========
function createUser() {
  // references to the input fields
  let nameVal = document.querySelector('#name');
  let mailVal = document.querySelector('#mail');
  let imageSrc = document.querySelector('#imagePreview');

  
  let newUser = {
    name: nameVal.value,
    mail: mailVal.value,
    img: imageSrc.src
  };

  _userRef.add(newUser);
  navigateTo("all-characters");

  nameVal.value = "";
  mailVal.value = "";
  imageSrc.src = "";

}

function createCharacter() {
  let nameVal = document.querySelector('#name')
  let 
}

/*function createUser() {
  // references to the input fields
  let nameVal = document.querySelector('#name');
  let mailVal = document.querySelector('#mail');
  let imageSrc = document.querySelector('#imagePreview');

  // TODO: create a new object called newUser with the properties: name, mail & img. Add newUser to _userRef (cloud firestore)
  // make sure to nagivate to home: navigateTo("home");
  let newUser = {
    name: nameVal.value,
    mail: mailVal.value,
    img: imageSrc.src
  };

  _userRef.add(newUser);
  navigateTo("home");

  nameVal.value = "";
  mailVal.value = "";
  imageSrc.src = "";

}

function createCharacter() {
  let nameVal = document.querySelector('#name')
  let 
}*/

/*
// ========== UPDATE ==========

function selectUser(id, name, mail, img) {
  // references to the input fields
  let nameInput = document.querySelector('#name-update');
  let mailInput = document.querySelector('#mail-update');
  let imageInput = document.querySelector('#imagePreviewUpdate');
  nameInput.value = name;
  mailInput.value = mail;
  imageInput.src = img;
  _selectedUserId = id;
  navigateTo("edit");
}

function updateUser() {
  let nameInput = document.querySelector('#name-update');
  let mailInput = document.querySelector('#mail-update');
  let imageInput = document.querySelector('#imagePreviewUpdate');

  // TODO: create a userToUpdate object and update _userRef (cloud firestore)
  // make sure to nagivate to home
  let userToUpdate = {
    name: nameInput.value,
    mail: mailInput.value,
    img: imageInput.src
  };

  _userRef.doc(_selectedUserId).update(userToUpdate);
  navigateTo("home");

}

// ========== DELETE ==========
function deleteUser(id) {
  // TODO: delete user by the given id
  _userRef.doc(id).delete();
}
*/

//** ----------- Delete a Character ----------- **//
function deleteCharacter(id) {
  _characterRef.doc(id).delete();
}

/*
// doing the magic - image preview
function previewImage(file, previewId) {
  if (file) {
    _selectedImgFile = file;
    let reader = new FileReader();
    reader.onload = event => {
      document.querySelector('#' + previewId).setAttribute('src', event.target.result);
    };
    reader.readAsDataURL(file);
  }
}*/




//** ----------- Loader functionality ----------- **//
function showLoader(show = true) {
  let loader = document.querySelector('#loader');
  if (show) {
    loader.classList.remove("hide");
  } else {
    loader.classList.add("hide");
  }
}