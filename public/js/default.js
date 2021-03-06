var TTIC = ['#1abc9c','#2ecc71','#3498db','#9b59b6','#34495e','#16a085','#2980b9','#8e44ad','#2c3e50','#f1c40f','#e67e22','#e74c3c','#d35400','#c0392b'];

Thelpers.initials = function(value, fullname) {

	var initials;

	if (fullname) {
		initials = value;
	} else {
		var index = value.indexOf('.');
		var arr = value.substring(index + 1).replace(/\s{2,}/g, ' ').trim().split(' ');
		initials = ((arr[0].substring(0, 1) + (arr[1] || '').substring(0, 1))).toUpperCase();
	}

	var sum = 0;
	for (var i = 0; i < value.length; i++)
		sum += value.charCodeAt(i);

	return '<span class="initials" style="background-color:{1}" title="{2}">{0}</span>'.format(initials, TTIC[sum % TTIC.length], value);
};

Thelpers.color = function(value) {
	var hash = HASH(value, true);
	var color = '#';
	for (var i = 0; i < 3; i++) {
		var value = (hash >> (i * 8)) & 0xFF;
		color += ('00' + value.toString(16)).substr(-2);
	}
	return color;
};
