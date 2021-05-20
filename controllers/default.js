exports.install = function() {
	ROUTE('+GET /*');
	ROUTE('-GET /*', 'login');
};
