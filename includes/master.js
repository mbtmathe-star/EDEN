function textCounter(field, countfield, maxlimit) {
	if (field.value.length > maxlimit) { field.value = field.value.substring(0, maxlimit); }
	else { countfield.value = maxlimit - field.value.length; }
}

function open_CentreWindow(url, w, h, boxname) {
	var myleft = (screen.width - w) / 2
	var mytop = (screen.height - 50 - h) / 2
	mywin = window.open(url, boxname, 'toolbar=0,location=0,directories=0,status=0,menubar=0,scrollbars=1,resizable=1,width=' + w + ',height=' + h + ',top=' + mytop + ',left=' + myleft);
	mywin.focus();
}

function open_FixedWindow(url, l, t, w, h, boxname) {
	mywin = window.open(url, boxname, 'toolbar=0,location=0,directories=0,status=1,menubar=0,scrollbars=1,resizable=1,width=' + w + ',height=' + h + ',top=' + t + ',left=' + l);
	mywin.focus();
}

function toggle(menuId) {
	thisId = document.getElementById(menuId);
	if (thisId.style.display == "none") {
		thisId.style.display = "block";
	}
	else {
		thisId.style.display = "none";
	}
}

function ConfirmDelete(url) {
	if (confirm("Are you sure you want to delete this item/record?") == true) { window.location = url; }
}
function ConfirmThis(msg, url) {
	if (confirm(msg) == true) { window.location = url; }
}

function Confirm(msg, url) {
	if (confirm(msg) == true) { window.location = url; }
}