// hmm hmm
const baseURL = "https://g.sawczak.com/shuffler";

const defaultItems = [
  'Example',
  'Exemple',
  'Ejemplo',
  'Esempio',
  'Beispiel',
  'Voorbeeld'
];

const defaultGroupNames = [];

const getItems = () => {
  return DOMTools.getTextareaLines($("#items"));
};

const getGroupNames = () => {
  return DOMTools.getTextareaLines($("#groupNames"));
};

const setItems = (items) => {
  DOMTools.setTextareaLines($("#items"), items);
  handleItemsUpdate();
};

const setGroupNames = (items) => {
  DOMTools.setTextareaLines($("#groupNames"), items);
  handleGroupNamesUpdate();
};

const getUniqueItems = () => {
  return Array.from(new Set(getItems()));
};

const shouldDraggingSwap = () => {
  return app.optDraggingBehaviour.value() === "draggingSwap";
};

// TODO precisely the kind of thing that should be non-destructive
const handleBalanceLeftoversUpdate = () => {
  clearGroups();
};

const handleDraggingBehaviourUpdate = () => {
  let swap = shouldDraggingSwap();

  for (let s of app.sortables) {
    s.option("swap", swap);
  }
  updateShareURL();
};

const handleNGroupsSlide = (value) => {
  app.optNGroups.value(value);
  handleNGroupsUpdate();
};

const handleNPerGroupSlide = (value) => {
  app.optNPerGroup.value(value);
  handleNPerGroupUpdate();
};

const handleNGroupsUpdate = () => {
  let v = app.optNGroups.value();
  let n = getItems().length;
  app.optNPerGroup.value(Math.max(1, Math.floor(n / v)));
  $("#reportNLeftovers").html(n % v);
  clearGroups();
};

const handleNPerGroupUpdate = () => {
  let v = app.optNPerGroup.value();
  let n = getItems().length;
  app.optNGroups.value(Math.max(1, Math.floor(n / v)));
  $("#reportNLeftovers").html(n % v);
  clearGroups();
};

const handleGroupNamesUpdate = () => {
  let names = getGroupNames();
  updateButtonStates();

  applyGroupNamesToHTML();
  updateShareURL();
};

const handleItemsUpdate = () => {
  let items = getItems();
  let n = items.length;
  let oldNGroups = app.optNGroups.value();
  let nGroups, nPer, nLeftovers;

  // Subtracting below current # of groups
  if (app.optNGroups.value() > n) {
    app.optNGroups.value(n);
  }

  // Restrict upper limit
  app.optNGroups.max(n);
  app.optNPerGroup.max(n);

  // Dropping to 0 items
  if (n === 0) {
    app.optNGroups.min(0);
    app.optNPerGroup.min(0);

    nPer = 0;
    nLeftovers = 0;
    nGroups = 0;
  } else {
    // Going up from 0 groups previously
    if (oldNGroups === 0) {
      nGroups = 1;
    } else {
      nGroups = oldNGroups;
    }

    app.optNGroups.min(1);
    app.optNPerGroup.min(1);

    nPer = Math.max(1, Math.floor(n / nGroups));
    nLeftovers = n % nGroups;
  }

  app.optNGroups.value(nGroups);
  app.optNPerGroup.value(nPer);
  $("#reportNItems").html(n);
  $("#reportNLeftovers").html(nLeftovers);

  clearGroups();
};

const updateButtonStates = () => {
  let items = getItems();
  let uItems = getUniqueItems();
  let n = items.length;
  let ng = getGroupNames().length;

  $("#clearItems").prop("disabled", n === 0);
  $("#removeDoubleItems").prop("disabled", n === uItems.length);

  $("#sortItemsRandom").prop("disabled", n < 2);
  $("#sortItemsAZ").prop("disabled", n < 2);
  $("#sortItemsZA").prop("disabled", n < 2);

  $("#clearGroupNames").prop("disabled", ng === 0);
  $("#sortGroupNamesRandom").prop("disabled", ng < 2);

  $("#clearGroups").prop("disabled", !app.groupsPopulated);
  $("#makeGroupsOrdered").prop("disabled", n === 0);
  $("#makeGroupsShuffled").prop("disabled", n < 2);
  $("#makeGroupsAZ").prop("disabled", n < 2);
  $("#makeGroupsZA").prop("disabled", n < 2);

  // TODO these options don't exist yet
  $("#transformGroupsJigsaw").prop("disabled", true);
  $("#undoGroupChange").prop("disabled", true);
  $("#redoGroupChange").prop("disabled", true);

  // Options
  app.optShareItems.disable(n === 0);
  app.optShareGroupNames.disable(ng === 0);
  // app.shareParemeters.disable(n === 0); // Never needed
  app.optShareGroups.disable((!app.groupsPopulated) || (!app.optShareItems.value()));
};

const thereAreLeftovers = () => {
  let nItems = getItems().length;
  let nGroups = app.optNGroups.value();
  let nPer = app.optNPerGroup.value();

  return nItems % (nGroups * nPer) > 0;
};

const needLeftoversGroup = () => {
  return (
    thereAreLeftovers() &&
    app.optBalanceLeftovers.value() === "leftoversCollect"
  );
};

const displayGroups = () => {
  $("#groups").html(createGroupHTML());
  applyGroupNamesToHTML();
};

const makeBaseGroups = () => {
  let nGroups = app.optNGroups.value();

  app.groups = [];
  for (let i = 0; i < nGroups; i++) {
    app.groups.push([]);
  }

  if (needLeftoversGroup()) {
    app.groups.push([]);
  }

  app.groupsPopulated = false;
};

const clearGroups = () => {
  makeBaseGroups();
  displayGroups();
  updateButtonStates();
  updateShareURL();
};

const makeGroups = (items) => {
  makeBaseGroups();
  placeInGroups(items);
  displayGroups();
  makeSortables();
  updateButtonStates();
  updateShareURL();
};

const makePremadeGroups = (groups) => {
  app.groups = groups;
  app.groupsPopulated = true;

  displayGroups();
  makeSortables();
  updateButtonStates();
  updateShareURL();
}

const makeGroupsShuffled = () => {
  makeGroups(Random.shuffle(getItems()));
};

const makeGroupsOrdered = () => {
  makeGroups(getItems());
};

const makeGroupsAZ = () => {
  let items = getItems();
  items.sort();
  makeGroups(items);
};

const makeGroupsZA = () => {
  let items = getItems();
  items.sort();
  items.reverse();
  makeGroups(items);
};

const makeSortables = () => {
  app.sortables = [];
  let swap = shouldDraggingSwap();

  for (let el of document.getElementsByClassName("groupItems")) {
    app.sortables.push(
      Sortable.create(el, {
        swapThreshold: 1,
        animation: 50,
        group: "groups",
        swap: swap,
        onEnd: handleDrop
      })
    );
  }
};

const formatNoItemsNotice = () => {
  return "<div id='noItemsNotice' class='group flexCol'><h3>Add some items over on the left!</h3></div>";
};

const fillOutGroupNames = () => {
  let names = getGroupNames();
  let nGroups = app.optNGroups.value();

  let n = names.length + 1;
  if (names.length < nGroups) {
    while (names.length < nGroups) {
      names.push(`Group ${n}`);
      n += 1;
    }

    // Remember that if so, nGroups is one less than needed, so no need to pop
    if (needLeftoversGroup()) {
      names.push("Leftovers");
    }
  }

  return names;
};

const applyGroupNamesToHTML = () => {
  let names = fillOutGroupNames();

  for (let i = 0; i < app.groups.length; i++) {
    $(`#group-${i} .groupName`).html(names[i]);
  }
};

const createGroupHTML = () => {
  let outer = [];
  let group, inners, item;

  if (app.groups.length === 0) {
    return formatNoItemsNotice();
  } else {
    for (let i = 0; i < app.groups.length; i++) {
      group = app.groups[i];
      inners = [];
      if (group.length > 0) {
        for (let j = 0; j < group.length; j++) {
          item = group[j];
          inners.push(`<div class='groupItem' data-item-name="${item}" data-item="${j}" data-group="${i}" id="item-${i}-${j}">${item}</div>`);
        }
      }

      outer.push(
        `<div class='group flexCol' data-group="${i}" id="group-${i}"><h3 class="groupName"></h3><div class='groupItems flexCol' data-group="${i}" id="groupItems-${i}">${inners.join(
          ""
        )}</div></div>`
      );
    }
  }
  return outer.join("");
};

// TODO would be nice to preserve groups somehow as much as possible
// when things change, e.g. more items are added or # per group increased
const placeInGroups = (items) => {
  app.groups = [];

  let nGroups = app.optNGroups.value();
  let nPerGroup = app.optNPerGroup.value();

  let itemsConsume = items.slice();
  let leftovers = items.slice(nGroups * nPerGroup);

  let leftoversGroup = needLeftoversGroup();

  for (let i = 0; i < nGroups; i++) {
    app.groups[i] = [];
    for (let j = 0; j < nPerGroup; j++) {
      app.groups[i].push(itemsConsume[0]);
      itemsConsume = itemsConsume.slice(1);
    }
  }

  if (leftoversGroup) {
    app.groups.push(items.slice(nGroups * nPerGroup));
  } else {
    for (let i = 0; i < leftovers.length; i++) {
      app.groups[i].push(leftovers[i]);
    }
  }

  app.groupsPopulated = true;
};

const sortGroupNamesRandom = () => {
  setGroupNames(Random.shuffle(getGroupNames()));
};

const sortItemsRandom = () => {
  setItems(Random.shuffle(getItems()));
};

const sortItemsAZ = () => {
  let items = getItems();
  items.sort();
  setItems(items);
};

const sortItemsZA = () => {
  let items = getItems();
  items.sort();
  items.reverse();
  setItems(items);
};

const handleDrop = (evt) => {

  // TODO swapping apparently when sharing left one group w/ undefined
  // and the other with two in it

  // Receate the drop in the app groups model
  // for the purpose of shareURL etc.
  // Swap triggers this function twice

  let iGroupOrig = parseInt($(evt.from).attr('data-group'));
  let iGroupDest = parseInt($(evt.to).attr('data-group'));
  let iItemOrig = evt.oldIndex;
  let iItemDest = evt.newIndex;

  let item = app.groups[iGroupOrig][iItemOrig];
  app.groups[iGroupOrig].splice(iItemOrig, 1);
  app.groups[iGroupDest].splice(iItemDest, 0, item);

  updateShareURL();
}

const handleToggleShowSide = () => {
  if (app.optShowSide.value()) {
    $('#itemsPanel').removeClass('hideSide');
    $('#parametersPanel').removeClass('hideSide');
    $('#groupsPanel').removeClass('hideSide');
  } else {
    $('#itemsPanel').addClass('hideSide');
    $('#parametersPanel').addClass('hideSide');
    $('#groupsPanel').addClass('hideSide');
  }

  updateShareURL();
}

const handleKeyup = (e) => {
  if ($("#items").is(":focus")) {
    handleItemsUpdate();
  } else if ($("#groupNames").is(":focus")) {
    handleGroupNamesUpdate();
  }

  // switch (e.code) {
  //   case "KeyR":
  //     reset();
  //     break;
  // }
};

const clearGroupNames = () => {
  setGroupNames([]);
};

const clearItems = () => {
  setItems([]);
  clearGroups();
};

const removeDoubleItems = () => {
  setItems(getUniqueItems());
};

const reset = () => {
setOptionDefaults();
  clearGroups();
};

const bind = () => {
  $(document).keyup(handleKeyup);

  $('#reset').click(reset);

  $("#clearItems").click(clearItems);
  $("#removeDoubleItems").click(removeDoubleItems);

  $("#sortItemsRandom").click(sortItemsRandom);
  $("#sortItemsAZ").click(sortItemsAZ);
  $("#sortItemsZA").click(sortItemsZA);

  $("#clearGroupNames").click(clearGroupNames);
  $("#sortGroupNamesRandom").click(sortGroupNamesRandom);

  $("#makeGroupsShuffled").click(makeGroupsShuffled);
  $("#makeGroupsOrdered").click(makeGroupsOrdered);
  $("#makeGroupsAZ").click(makeGroupsAZ);
  $("#makeGroupsZA").click(makeGroupsZA);

  $("#clearGroups").click(clearGroups);

  app.optNGroups.slide((e, ui) => {
    handleNGroupsSlide(parseInt(ui.value));
  });
  app.optNPerGroup.slide((e, ui) => {
    handleNPerGroupSlide(parseInt(ui.value));
  });

  app.optBalanceLeftovers.change(handleBalanceLeftoversUpdate);
  app.optDraggingBehaviour.change(handleDraggingBehaviourUpdate);

  app.optShareItems.change(updateButtonStates);
  app.optShareItems.change(updateShareURL);
  app.optShareGroupNames.change(updateShareURL);
  app.optShareParameters.change(updateShareURL);
  app.optShareGroups.change(updateShareURL);

  app.optShowSide.change(handleToggleShowSide);
};

const createOptions = () => {
  app.optNGroups = new OptionSlider($("#optNGroups"));
  app.optNPerGroup = new OptionSlider($("#optNPerGroup"));
  app.optBalanceLeftovers = new OptionRadio($('input[name="radioLeftovers"]'));
  app.optDraggingBehaviour = new OptionRadio($('input[name="radioDragging"]'));

  app.optShareItems = new OptionCheckbox($("#shareItems"));
  app.optShareGroupNames = new OptionCheckbox($("#shareGroupNames"));
  app.optShareParameters = new OptionCheckbox($("#shareParameters"));
  app.optShareGroups = new OptionCheckbox($("#shareGroups"));

  app.optShowSide = new OptionCheckbox($("#showSide"));
};

const setOptionDefaults = () => {
  setItems(defaultItems);
  setGroupNames(defaultGroupNames);

  app.optNGroups.value(3);
  app.optNPerGroup.value(2);
  app.optBalanceLeftovers.value("leftoversDistribute");
  app.optDraggingBehaviour.value("draggingMove");

  app.optShareItems.value(true);
  app.optShareGroupNames.value(false);
  app.optShareParameters.value(false);
  app.optShareGroups.value(false);

  app.optShowSide.value(true);
};

// link stuff

const packShareData = () => {
  let d = {};

  // d['i'] = slinkIO.compress(getItems().join('_'));
  // d['a'] = slinkIO.compress(getGroupNames().join('_'));

  if ((!app.optShareItems.isDisabled()) && app.optShareItems.value()) {
    d["i"] = getItems().join("_");
  }

  if ((!app.optShareGroupNames.isDisabled()) && app.optShareGroupNames.value()) {
    d["a"] = getGroupNames().join("_");
  }

  if ((!app.optShareParameters.isDisabled()) && app.optShareParameters.value()) {
    d["n"] = app.optNGroups.value();

    d["o"] = "";

    // 0 = default, 1 = alternative
    // TODO could perhaps map this (in which case it could be used for unpacking too)

    d["o"] += JSTools.boolToInt(
      app.optBalanceLeftovers.value() !== "leftoversDistribute"
    );
    d["o"] += JSTools.boolToInt(
      app.optDraggingBehaviour.value() !== "draggingMove"
    );
    d["o"] += JSTools.boolToInt(
      app.optShowSide.value()
    );
  }

  if ((!app.optShareGroups.isDisabled()) && app.optShareGroups.value()) {
    let items = getItems();
    let groups = [];

    let group;
    for (let g of app.groups) {
      group = [];
      for (let item of g) {
        group.push(items.indexOf(item));
      }
      groups.push(group.join("-"));
    }

    d["g"] = groups.join("_");
  }

  return d;
};

const unpackShareData = d => {

  if ('i' in d) {
    app.optShareItems.value(true);
    setItems(d['i'].split('_'));
  }

  if ('a' in d) {
    app.optShareGroupNames.value(true);
    setGroupNames(d['a'].split('_'));
  }

  if ('n' in d) {
    app.optShareParameters.value(true);
    app.optNGroups.value(parseInt(d['n']));
    handleNGroupsUpdate();
  }

  if ('o' in d) {
    app.optShareParameters.value(true);

    // TODO map?
    if (d['o'][0] === '0') {
      app.optBalanceLeftovers.value('leftoversDistribute');
    } else if (d['o'][0] === '1') {
      app.optBalanceLeftovers.value('leftoversCollect');
    }

        if (d['o'][1] === '0') {
      app.optDraggingBehaviour.value('draggingMove');
    } else if (d['o'][1] === '1') {
      app.optDraggingBehaviour.value('draggingSwap');
    }

        if (d['o'][2] === '0') {
      app.optShowSide.value(false);
    } else if (d['o'][2] === '1') {
      app.optShowSide.value(true);
    }
    handleToggleShowSide();
  }

  if ('g' in d) {
    app.optShareGroups.value(true);

    let itemNames = getItems();
    let groups = [];
    let group;
    let itemIndices;

    for (let g of d['g'].split('_')) {
      group = [];

      // User could technically swap everyone out of a group,
      // in which case the for loop would yield undefined
      itemIndices = g.split('-');
      if (itemIndices.length > 0) {
        for (let i of itemIndices) {
          group.push(itemNames[parseInt(i)]);
        }
      }

      groups.push(group);
    }

    app.optNGroups.value(groups.size);
    handleNGroupsUpdate();
    makePremadeGroups(groups);
  }
};

const shareDataIsDefault = () => {
  let paramsAreDefault = [
    app.optNGroups.value() === 3,
    app.optNPerGroup.value() === 2,
    app.optBalanceLeftovers.value() === 'leftoversDistribute',
    app.optDraggingBehaviour.value() === 'draggingMove',
    app.optShowSide.value(),
  ].every(Boolean);

  return [
    app.groups.every(g => g.length === 0),
    (! app.optShareParameters.value() || paramsAreDefault),
    (! app.optShareItems.value() || (JSON.stringify(getItems()) === JSON.stringify(defaultItems))),
    (! app.optShareGroupNames.value() || (JSON.stringify(getGroupNames()) === JSON.stringify(defaultGroupNames))),
    (! app.optShareGroups.value() || (! app.groupsPopulated))
  ].every(Boolean);
};

const updateShareURL = () => {
  $("#shareURL").val(sLinkIO.updateShareURL());
  // debug
  console.log(sLinkIO.updateShareURL());
};

const sLinkIO = new LinkIO(
  baseURL,
  packShareData,
  unpackShareData,
  shareDataIsDefault
);

const initialize = () => {
  app = new App();

  stage = new Stage();
  stage.createScenes([
    {name: "game", panelSelector: "#gamePanel"},
    {name: "help", panelSelector: "#helpPanel", toggleSelector: "#btnHelp"}
  ]);
  stage.setDefault("game");
  stage.show("game");

  createOptions();
  bind();
  setOptionDefaults();

  reset();

  sLinkIO.createCopyShareURLButton(
    $("#shareButtonContainer"),
    "share",
    "copyPingNotification",
    "",
    "buttonBase buttonEffects buttonFooter",
    "Copy",
    "Copy share URL"
  );

  // Doesn't seem to do anything with input
  // sLinkIO.bindCopyShareURLButton(
  // 'shareInput',
  //   'copyPingNotification'
  // );

  handleItemsUpdate();

  sLinkIO.readURL();
};

class App {
  optNGroups;
  optNPerGroup;
  optBalanceLeftovers;
  optDraggingBehaviour;

  optShareItems;
  optShareGroupNames;
  optShareParameters;
  optShareGroups;

  optShowSide;

  groups;
  sortables;
  groupsPopulated;

  constructor() {
    this.optNGroups = null;
    this.optNPerGroup = null;
    this.optBalanceLeftovers = null;
    this.optDraggingBehaviour = null;

    this.optShareItems = null;
    this.optShareGroupNames = null;
    this.optShareParameters = null;
    this.optShareGroups = null;

    this.optShowSide = null;

    this.groups = [];
    this.sortables = [];
    this.groupsPopulated = false;
  }
}

var stage;
var app;
$(document).ready(initialize);
