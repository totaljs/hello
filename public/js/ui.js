COMPONENT('kanban', 'parent:parent;margin:0;padding:10;style:1', function(self, config, cls) {

	var cls2 = '.' + cls;
	var init = false;
	var events = {};
	var draggable;
	var gtemplate;
	var body;
	var selector = cls2 + '-item';
	var adi = 'data-id';
	var skip = false;
	var cachesize;

	self.scrollbars = [];

	self.readonly();
	self.make = function() {
		self.aclass(cls);
		var scr = self.find('script');
		gtemplate = Tangular.compile(scr[0].innerHTML);
		self.template = Tangular.compile(scr[1].innerHTML);
		scr.remove();
		self.append('<div class="{0}-container"><div class="{0}-body"></div></div>'.format(cls));
		body = self.find(cls2 + '-body');
		// self.scrollbar = new SCROLLBAR(self.find(cls2 + '-container'), { visibleY: 1 });
		self.resize();

		config.dblclick && self.event('dblclick', selector, function() {
			var el = $(this);
			var group = self.findgroup(el.attrd('id'));
			group && self.SEEX(config.dblclick, group);
		});

		config.contextmenu && self.event('contextmenu', selector, function(e) {
			var el = $(this);
			var group = self.findgroup(el.attrd('id'));
			self.EXEC(config.contextmenu, group, el, e);
			e.preventDefault();
		});

		self.event('dragenter dragover dragexit drop dragleave dragstart', events.ondrag);
		$(document).on('mousedown', selector, events.ondown);
		self.on('resize2 + resize', self.resize2);
	};

	self.findgroup = function(id) {
		var data = self.get();
		for (var i = 0; i < data.length; i++) {
			var item = data[i];
			var index = item.items.findIndex('id', id);
			if (index !== -1)
				return { group: item, item: item.items[index], index: index };
		}
	};

	self.move = function(fromid, togroup, toindex) {

		var data = self.get();
		var group = self.findgroup(fromid);

		if (!group)
			return;

		var index = group.index;
		var item = group.item;
		group = group.group;

		var target = data.findItem('id', togroup);
		if (!target)
			return false;

		var item = group.items[index];
		if (toindex != null) {
			if (group === target)
				target.items.splice(target.items.indexOf(item), 1);
			target.items.splice(toindex, 0, item);
		} else
			target.items.unshift(item);

		if (group !== target)
			group.items.splice(index, 1);

		skip = true;
		self.update();

		if (config.move) {
			target = { group: target, item: item, index: toindex };
			self.EXEC(config.move, group, target);
		}

		self.resizebody();
		return true;
	};

	self.remove = function(id) {
		var el = self.find(cls2 + '-item[data-id="{0}"]'.format(id));
		if (el.length) {
			el.remove();
			var group = self.findgroup(id);
			if (group) {
				group.group.items.splice(group.index, 1);
				skip = true;
				self.update();
				config.remove && self.EXEC(config.remove, group);
				return true;
			}
		}
	};

	events.ondrag = function(e) {

		if (!draggable)
			return;

		if (e.type !== 'dragstart') {
			e.stopPropagation();
			e.preventDefault();
		}

		switch (e.type) {
			case 'drop':

				var a = draggable;
				var b = e.target;
				var node;
				var nodetype;

				while (true) {

					var cn = b.getAttribute('class');

					if (cn === (cls + '-group-items') || cn === (cls + '-group-body')) {
						// group

						if (cn === cls + '-group-items')
							b = b.parentNode;

						node = b.parentNode;
						nodetype = 1;

						break;
					} else if (cn === (cls + '-item')) {
						// item
						node = b;
						nodetype = 2;
						break;
					} else
						b = b.parentNode;

					if (b === self.dom || b == null || b.tagName === 'HTML')
						return;
				}

				var aid = a.getAttribute(adi);

				if (nodetype === 1) {
					$(node).find(cls2 + '-group-items')[0].appendChild(a);
					self.move(aid, node.getAttribute(adi), null, true);
					return;
				}

				node.parentNode.insertBefore(a, node);

				var index = -1;
				var children = node.parentNode.children;

				for (var i = 0; i < children.length; i++) {
					if (children[i] === a) {
						index = i;
						break;
					}
				}

				var parent = node;
				var id;

				for (var i = 0; i < 5; i++) {
					parent = parent.parentNode;
					if (parent !== self.dom) {
						id = parent.getAttribute(adi);
						if (id)
							break;
					}
				}

				id && self.move(aid, id, index, true);
				break;

			case 'dragstart':
				var eo = e.originalEvent;
				if (eo.dataTransfer)
					eo.dataTransfer.setData('text', '1');
				break;
			case 'dragenter':
			case 'dragover':
			case 'dragexit':
			case 'dragleave':
				break;
		}
	};

	events.ondown = function() {
		draggable = this;
	};

	self.resize2 = function() {
		setTimeout2(self.ID + 'resize', self.resize, 300);
	};

	self.destroy = function() {
		$(document).off('mousedown', selector, events.ondown);
	};

	self.resize = function() {

		if (self.release())
			return;

		var el = self.parent(config.parent);
		var h = el.height();
		var w = el.width();

		if (h === 0 || w === 0) {
			self.$waiting && clearTimeout(self.$waiting);
			self.$waiting = setTimeout(self.resize, 234);
			return;
		}

		var width = WIDTH();
		var key = width + 'x' + w + 'x' + h;
		if (cachesize === key)
			return;

		cachesize = key;

		var margin = config.margin;
		var responsivemargin = config['margin' + width];

		if (responsivemargin != null)
			margin = responsivemargin;

		var css = {};

		css.height = h - margin;
		self.find(cls2 + '-container').css(css);

		self.element.SETTER('*', 'resize');
		var c = cls + '-hidden';
		self.hclass(c) && self.rclass(c, 100);

		// self.scrollbar.resize();

		if (!init) {
			self.rclass('invisible', 250);
			init = true;
		}

		setTimeout(self.resizebody, 100);
	};

	self.resizebody = function() {

		var arr = body.find(cls2 + '-group');
		var sum = config.padding * 2;

		for (var i = 0; i < arr.length; i++)
			sum += $(arr[i]).width();

		var container = self.find(cls2 + '-container');
		var w = container.width();
		var h = container.height();

		body.css('width', sum < w ? 'auto' : (sum + 'px'));
		// self.scrollbar.resize();

		arr = body.find(cls2 + '-scrollbar');

		var prop = config.style === 1 ? 'height' : 'max-height';

		for (var i = 0; i < arr.length; i++) {
			var el = $(arr[i]);
			var wh = h - el.position().top - (config.padding * 2);
			el.parent().parent().css(prop, wh);
			var css = {};
			css[prop] = wh;
			el.css(css);
		}

		for (var i = 0; i < self.scrollbars.length; i++)
			self.scrollbars[i].resize();
	};

	self.setter = function(value, path, type) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value)
			value = EMPTYARRAY;

		var obj = {};

		if (!type) {
			var builder = [];
			for (var i = 0; i < value.length; i++) {
				var group = value[i];
				var items = group.items;
				var tmp = [];
				builder.push('<section class="{0}-group {0}-group-{1}" data-id="{1}"><div class="{0}-group-body">{2}<div class="{0}-scrollbar"><div class="{0}-group-items {0}-group-items-{1}"></div></div></div></section>'.format(cls, group.id, gtemplate(group)));
			}
			body.html(builder.join(''));

			self.scrollbars = [];

			body.find(cls2 + '-scrollbar').each(function() {
				var scrollbar = SCROLLBAR($(this), { shadow: true, visibleY: true, visibleX: false, orientation: 'y' });
				self.scrollbars.push(scrollbar);
			});
		}

		for (var i = 0; i < value.length; i++) {
			var group = value[i];
			var items = group.items;
			var tmp = [];
			for (var j = 0; j < items.length; j++) {
				obj.value = items[j];
				var clsplus = (obj.value.solverid === user.id && obj.value.userid !== user.id) ? ' target' : (obj.value.userid === user.id && obj.value.solverid !== user.id) ? ' owner' : '';
				tmp.push('<figure class="{0}-item{3}" draggable="true" data-id="{1}">{2}</figure>'.format(cls, obj.value.id, self.template(obj.value), clsplus));
			}
			self.find(cls2 + '-group-items-' + group.id).html(tmp.join(''));
		}

		self.resizebody();
		// self.element.find('.noscrollbar').noscrollbar();
	};

});

COMPONENT('enterbox', function(self, config, cls) {

	self.readonly();
	self.nocompile();

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'icon':
				self.find('i').rclass().aclass(self.faicon(value));
				break;
			case 'placeholder':
				self.find('input').prop('placeholder', value);
				break;
			case 'maxlength':
				self.find('input').prop('maxlength', value);
				break;
		}
	};

	self.make = function() {
		self.aclass(cls);
		self.append('<div class="{3}-button"><button><i class="{0}"></i>{4}</button></div><div class="{3}-input"><input type="text" placeholder="{1}" maxlength="{2}" /></div>'.format(self.faicon(config.icon) || 'fa fa-keyboard-o', config.placeholder, config.maxlength || 50, cls, config.button || ''));
		self.event('click', 'button', self.submit);
		self.event('keyup', 'input', function(e) {
			e.which === 13 && self.submit();
		});
	};

	self.submit = function() {
		var val = self.find('input').val();
		config.exec && self.EXEC(config.exec, val, self.clear);
		self.path && self.set(val);
	};

	self.clear = function() {
		self.find('input').val('');
		config.exec && self.EXEC(config.exec, '');
		self.path && self.set('');
	};

	self.setter = function(value) {
		self.find('input').val(value == null ? '' : value.toString());
	};
});

COMPONENT('edit', 'type:dblclick;id:data-id', function(self, config, cls) {

	self.readonly();

	self.make = function() {
		self.aclass(cls);
		self.event(config.type, '.edit', function(e) {

			var t = this;
			var el = $(t);
			var opt = (el.attrd('edit') || '').parseConfig();

			opt.element = opt.el = el;
			opt.event = e;
			opt.model = self.path ? self.get() : null;
			opt.path = self.path;
			opt.component = self;

			if (config.id) {
				var attr = config.id;
				while (t) {

					if (t === self.dom)
						break;

					var val = t.getAttribute(attr);
					if (val) {
						opt.id = val;
						opt.parent = $(t);
						break;
					}

					t = t.parentNode;
				}
			}

			self.EXEC(opt.exec || config.exec, opt, e);
		});
	};

});

COMPONENT('miniform', 'zindex:12', function(self, config, cls) {

	var cls2 = '.' + cls;
	var csspos = {};

	if (!W.$$miniform) {

		W.$$miniform_level = W.$$miniform_level || 1;
		W.$$miniform = true;

		$(document).on('click', cls2 + '-button-close', function() {
			SET($(this).attrd('path'), '');
		});

		var resize = function() {
			setTimeout2(self.name, function() {
				for (var i = 0; i < M.components.length; i++) {
					var com = M.components[i];
					if (com.name === 'miniform' && !HIDDEN(com.dom) && com.$ready && !com.$removed)
						com.resize();
				}
			}, 200);
		};

		ON('resize2', resize);

		$(document).on('click', cls2 + '-container', function(e) {

			if (e.target === this) {
				var com = $(this).component();
				if (com && com.config.closeoutside) {
					com.set('');
					return;
				}
			}

			var el = $(e.target);

			if (el.hclass(cls + '-container-cell')) {
				var form = $(this).find(cls2);
				var c = cls + '-animate-click';
				form.aclass(c).rclass(c, 300);
				var com = el.parent().component();
				if (com && com.config.closeoutside)
					com.set('');
			}
		});
	}

	self.readonly();
	self.submit = function() {
		if (config.submit)
			self.EXEC(config.submit, self.hide, self.element);
		else
			self.hide();
	};

	self.cancel = function() {
		config.cancel && self.EXEC(config.cancel, self.hide);
		self.hide();
	};

	self.hide = function() {
		if (config.independent)
			self.hideforce();
		self.esc(false);
		self.set('');
	};

	self.esc = function(bind) {
		if (bind) {
			if (!self.$esc) {
				self.$esc = true;
				$(W).on('keydown', self.esc_keydown);
			}
		} else {
			if (self.$esc) {
				self.$esc = false;
				$(W).off('keydown', self.esc_keydown);
			}
		}
	};

	self.esc_keydown = function(e) {
		if (e.which === 27 && !e.isPropagationStopped()) {
			var val = self.get();
			if (!val || config.if === val) {
				e.preventDefault();
				e.stopPropagation();
				self.hide();
			}
		}
	};

	self.hideforce = function() {
		if (!self.hclass('hidden')) {
			self.aclass('hidden');
			self.release(true);
			self.find(cls2).rclass(cls + '-animate');
			W.$$miniform_level--;
		}
	};

	self.icon = function(value) {
		var el = this.rclass2('fa');
		value.icon && el.aclass(value.icon.indexOf(' ') === -1 ? ('fa fa-' + value.icon) : value.icon);
		this.tclass('hidden', !value.icon);
	};

	self.resize = function() {

		if (!config.center || self.hclass('hidden'))
			return;

		var ui = self.find(cls2);
		var fh = ui.innerHeight();
		var wh = WH;
		var r = (wh / 2) - (fh / 2);
		csspos.marginTop = (r > 30 ? (r - 15) : 20) + 'px';
		ui.css(csspos);
	};

	self.make = function() {

		$(document.body).append('<div id="{0}" class="hidden {4}-container invisible"><div class="{4}-container-table"><div class="{4}-container-cell"><div class="{4}" style="max-width:{1}px"><div data-bind="@config__text span:value.title__change .{4}-icon:@icon" class="{4}-title"><button name="cancel" class="{4}-button-close{3}" data-path="{2}"><i class="fa fa-times"></i></button><i class="{4}-icon"></i><span></span></div></div></div></div>'.format(self.ID, config.width || 800, self.path, config.closebutton == false ? ' hidden' : '', cls));

		var scr = self.find('> script');
		self.template = scr.length ? scr.html().trim() : '';
		if (scr.length)
			scr.remove();

		var el = $('#' + self.ID);
		var body = el.find(cls2)[0];

		while (self.dom.children.length)
			body.appendChild(self.dom.children[0]);

		self.rclass('hidden invisible');
		self.replace(el, true);

		self.event('scroll', function() {
			EMIT('scroll', self.name);
			EMIT('reflow', self.name);
		});

		self.event('click', 'button[name]', function() {
			var t = this;
			switch (t.name) {
				case 'submit':
					self.submit(self.hide);
					break;
				case 'cancel':
					!t.disabled && self[t.name](self.hide);
					break;
			}
		});

		config.enter && self.event('keydown', 'input', function(e) {
			e.which === 13 && !self.find('button[name="submit"]')[0].disabled && setTimeout(self.submit, 800);
		});
	};

	self.configure = function(key, value, init, prev) {
		if (!init) {
			switch (key) {
				case 'width':
					value !== prev && self.find(cls2).css('max-width', value + 'px');
					break;
				case 'closebutton':
					self.find(cls2 + '-button-close').tclass('hidden', value !== true);
					break;
			}
		}
	};

	self.setter = function(value) {

		setTimeout2(cls + '-noscroll', function() {
			$('html').tclass(cls + '-noscroll', !!$(cls2 + '-container').not('.hidden').length);
		}, 50);

		var isHidden = value !== config.if;

		if (self.hclass('hidden') === isHidden) {
			if (!isHidden) {
				config.reload && self.EXEC(config.reload, self);
				config.default && DEFAULT(self.makepath(config.default), true);
			}
			return;
		}

		setTimeout2(cls, function() {
			EMIT('reflow', self.name);
		}, 10);

		if (isHidden) {
			if (!config.independent)
				self.hideforce();
			return;
		}

		if (self.template) {
			var is = self.template.COMPILABLE();
			self.find(cls2).append(self.template);
			self.template = null;
			is && COMPILE();
		}

		if (W.$$miniform_level < 1)
			W.$$miniform_level = 1;

		W.$$miniform_level++;

		self.css('z-index', W.$$miniform_level * config.zindex);
		self.rclass('hidden');

		self.resize();
		self.release(false);

		config.reload && self.EXEC(config.reload, self);
		config.default && DEFAULT(self.makepath(config.default), true);

		if (!isMOBILE && config.autofocus) {
			setTimeout(function() {
				self.find(typeof(config.autofocus) === 'string' ? config.autofocus : 'input[type="text"],select,textarea').eq(0).focus();
			}, 1000);
		}

		setTimeout(function() {
			self.rclass('invisible');
			self.find(cls2).aclass(cls + '-animate');
		}, 300);

		// Fixes a problem with freezing of scrolling in Chrome
		setTimeout2(self.ID, function() {
			self.css('z-index', (W.$$miniform_level * config.zindex) + 1);
		}, 500);

		config.closeesc && self.esc(true);
	};
});

COMPONENT('importer', function(self, config) {

	var init = false;
	var clid = null;
	var pending = false;
	var content = '';

	self.readonly();

	self.make = function() {
		var scr = self.find('script');
		content = scr.length ? scr.html() : '';
	};

	self.reload = function(recompile) {
		config.reload && EXEC(config.reload);
		recompile && COMPILE();
		setTimeout(function() {
			pending = false;
			init = true;
		}, 1000);
	};

	self.setter = function(value) {

		if (pending)
			return;

		if (config.if !== value) {
			if (config.cleaner && init && !clid)
				clid = setTimeout(self.clean, config.cleaner * 60000);
			return;
		}

		pending = true;

		if (clid) {
			clearTimeout(clid);
			clid = null;
		}

		if (init) {
			self.reload();
			return;
		}

		if (content) {
			self.html(content);
			setTimeout(self.reload, 50, true);
		} else
			self.import(config.url, self.reload);
	};

	self.clean = function() {
		config.clean && EXEC(config.clean);
		setTimeout(function() {
			self.empty();
			init = false;
			clid = null;
		}, 1000);
	};
});

COMPONENT('exec', function(self, config) {

	var regparent = /\?\d/;

	self.readonly();
	self.blind();
	self.make = function() {

		var scope = null;

		var scopepath = function(el, val) {
			if (!scope)
				scope = el.scope();
			return val == null ? scope : scope ? scope.makepath ? scope.makepath(val) : val.replace(/\?/g, el.scope().path) : val;
		};

		var fn = function(plus) {
			return function(e) {

				var el = $(this);
				var attr = el.attrd('exec' + plus);
				var path = el.attrd('path' + plus);
				var href = el.attrd('href' + plus);
				var def = el.attrd('def' + plus);
				var reset = el.attrd('reset' + plus);

				scope = null;

				var prevent = el.attrd('prevent' + plus);

				if (prevent === 'true' || prevent === '1') {
					e.preventDefault();
					e.stopPropagation();
				}

				if (attr) {
					if (attr.indexOf('?') !== -1) {
						var tmp = scopepath(el);
						if (tmp) {
							var isparent = regparent.test(attr);
							attr = tmp.makepath ? tmp.makepath(attr) : attr.replace(/\?/g, tmp.path);
							if (isparent && attr.indexOf('/') !== -1)
								M.scope(attr.split('/')[0]);
							else
								M.scope(tmp.path);
						}
					}
					EXEC(attr, el, e);
				}

				href && NAV.redirect(href);

				if (def) {
					if (def.indexOf('?') !== -1)
						def = scopepath(el, def);
					DEFAULT(def);
				}

				if (reset) {
					if (reset.indexOf('?') !== -1)
						reset = scopepath(el, reset);
					RESET(reset);
				}

				if (path) {
					var val = el.attrd('value');
					if (val) {
						if (path.indexOf('?') !== -1)
							path = scopepath(el, path);
						var v = GET(path);
						SET(path, new Function('value', 'return ' + val)(v), true);
					}
				}
			};
		};

		self.event('dblclick', config.selector2 || '.exec2', fn('2'));
		self.event('click', config.selector || '.exec', fn(''));
	};
});

COMPONENT('loading', function(self, config, cls) {

	var delay;
	var prev;

	self.readonly();
	self.singleton();
	self.nocompile();

	self.make = function() {
		self.aclass(cls + ' ' + cls + '-' + (config.style || 1));
		self.append('<div><div class="' + cls + '-text hellip"></div></div>');
	};

	self.show = function(text) {
		clearTimeout(delay);

		if (prev !== text) {
			prev = text;
			self.find('.' + cls + '-text').html(text || '');
		}

		self.rclass('hidden');
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(delay);
		delay = setTimeout(function() {
			self.aclass('hidden');
		}, timeout || 1);
		return self;
	};

});

COMPONENT('websocket', 'reconnect:3000;encoder:true', function(self, config) {

	var ws, url;
	var queue = [];
	var sending = false;

	self.online = false;
	self.readonly();
	self.nocompile && self.nocompile();

	self.make = function() {
		url = (config.url || '').env(true);
		if (!url.match(/^(ws|wss):\/\//))
			url = (location.protocol.length === 6 ? 'wss' : 'ws') + '://' + location.host + (url.substring(0, 1) !== '/' ? '/' : '') + url;
		setTimeout(self.connect, 500);
		self.destroy = self.close;

		$(W).on('offline', function() {
			self.close();
		});

		$(W).on('online', function() {
			setTimeout(self.connect, config.reconnect);
		});

	};

	self.send = function(obj) {
		var data = JSON.stringify(obj);
		if (config.encoder)
			queue.push(encodeURIComponent(data));
		else
			queue.push(data);
		self.process();
		return self;
	};

	self.process = function(callback) {

		if (!ws || !ws.send || sending || !queue.length || ws.readyState !== 1) {
			callback && callback();
			return;
		}

		sending = true;
		var async = queue.splice(0, 3);

		async.wait(function(item, next) {
			if (ws) {
				ws.send(item);
				setTimeout(next, 5);
			} else {
				queue.unshift(item);
				next();
			}
		}, function() {
			callback && callback();
			sending = false;
			queue.length && self.process();
		});
	};

	self.close = function(isClosed) {
		if (!ws)
			return self;
		self.online = false;
		ws.onopen = ws.onclose = ws.onmessage = null;
		!isClosed && ws.close();
		ws = null;
		self.isonline(false);
		return self;
	};

	self.isonline = function(is) {
		if (config.online)
			self.EXEC(config.online, is);
		else
			EMIT('online', is);
	};

	function onClose(e) {

		if (e.code === 4001) {
			location.href = location.href + '';
			return;
		}

		e.reason && WARN('WebSocket:', config.encoder ? decodeURIComponent(e.reason) : e.reason);
		self.close(true);
		setTimeout(self.connect, config.reconnect);
	}

	function onMessage(e) {

		var data;

		try {
			data = PARSE(config.encoder ? decodeURIComponent(e.data) : e.data);
		} catch (e) {
			return;
		}

		if (config.message)
			self.EXEC(config.message, data);
		else
			EMIT('message', data);
	}

	function onOpen() {
		self.online = true;
		self.process(function() {
			self.isonline(true);
		});
	}

	self.connect = function() {
		ws && self.close();
		setTimeout2(self.ID, function() {
			ws = new WebSocket(url.env(true));
			ws.onopen = onOpen;
			ws.onclose = onClose;
			ws.onmessage = onMessage;
		}, 100);
		return self;
	};
});

COMPONENT('message', 'button:OK', function(self, config, cls) {

	var cls2 = '.' + cls;
	var is;
	var events = {};

	self.readonly();
	self.singleton();
	self.nocompile && self.nocompile();

	self.make = function() {

		var pls = (config.style === 2 ? (' ' + cls + '2') : '');
		self.aclass(cls + ' hidden' + pls);

		if (config.closeoutside)
			self.event('click', function(e) {
				var node = e.target;
				var skip = { SPAN: 1, A: 1, I: 1 };
				if (!skip[node.tagName])
					self.hide();
			});
		else
			self.event('click', 'button', self.hide);
	};

	events.keyup = function(e) {
		if (e.which === 27)
			self.hide();
	};

	events.bind = function() {
		if (!events.is) {
			$(W).on('keyup', events.keyup);
			events.is = false;
		}
	};

	events.unbind = function() {
		if (events.is) {
			events.is = false;
			$(W).off('keyup', events.keyup);
		}
	};

	self.warning = function(message, icon, fn) {
		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}
		self.callback = fn;
		self.content(cls + '-warning', message, icon || 'warning');
	};

	self.info = function(message, icon, fn) {
		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}
		self.callback = fn;
		self.content(cls + '-info', message, icon || 'info-circle');
	};

	self.success = function(message, icon, fn) {

		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}

		self.callback = fn;
		self.content(cls + '-success', message, icon || 'check-circle');
	};

	self.response = function(message, callback, response) {

		var fn;

		if (typeof(message) === 'function') {
			response = callback;
			fn = message;
			message = null;
		} else if (typeof(callback) === 'function')
			fn = callback;
		else {
			response = callback;
			fn = null;
		}

		if (response instanceof Array) {
			var builder = [];
			for (var i = 0; i < response.length; i++) {
				var err = response[i].error;
				err && builder.push(err);
			}
			self.warning(builder.join('<br />'));
			SETTER('!loading/hide');
		} else if (typeof(response) === 'string') {
			self.warning(response);
			SETTER('!loading/hide');
		} else {

			if (message) {
				if (message.length < 40 && message.charAt(0) === '?')
					SET(message, response);
				else
					self.success(message);
			}

			if (typeof(fn) === 'string')
				SET(fn, response);
			else if (fn)
				fn(response);
		}
	};

	self.hide = function() {
		events.unbind();
		self.callback && self.callback();
		self.aclass('hidden');
	};

	self.content = function(classname, text, icon) {

		if (icon.indexOf(' ') === -1)
			icon = 'fa fa-' + icon;

		!is && self.html('<div><div class="{0}-icon"><i class="{1}"></i></div><div class="{0}-body"><div class="{0}-text"></div><hr /><button>{2}</button></div></div>'.format(cls, icon, config.button));

		self.rclass2(cls + '-').aclass(classname);
		self.find(cls2 + '-body').rclass().aclass(cls + '-body');

		if (is)
			self.find(cls2 + '-icon').find('.fa').rclass2('fa').aclass(icon);

		self.find(cls2 + '-text').html(text);
		self.rclass('hidden');
		is = true;
		events.bind();
		setTimeout(function() {
			self.aclass(cls + '-visible');
			setTimeout(function() {
				self.find(cls2 + '-icon').aclass(cls + '-icon-animate');
			}, 300);
		}, 100);
	};
});

COMPONENT('search', 'class:hidden;delay:50;attribute:data-search;splitwords:1;delaydatasource:100', function(self, config, cls) {

	self.readonly();

	self.make = function() {
		config.datasource && self.datasource(config.datasource, function() {
			setTimeout(function() {
				self.refresh();
			}, config.delaydatasource);
		});
	};

	self.search = function() {

		var value = self.get();
		var elements = self.find(config.selector);
		var length = elements.length;

		if (!value) {
			elements.rclass(config.class);
			self.rclass2(cls + '-');
			config.exec && self.SEEX(config.exec, { hidden: 0, count: length, total: length, search: '', is: false });
			return;
		}

		var search = value.toSearch();
		var count = 0;
		var hidden = 0;

		if (config.splitwords)
			search = search.split(' ');

		self.aclass(cls + '-used');

		for (var i = 0; i < length; i++) {

			var el = elements.eq(i);
			var val = (el.attr(config.attribute) || '').toSearch();
			var is = false;

			if (search instanceof Array) {
				for (var j = 0; j < search.length; j++) {
					if (val.indexOf(search[j]) === -1) {
						is = true;
						break;
					}
				}
			} else
				is = val.indexOf(search) === -1;

			el.tclass(config.class, is);

			if (is)
				hidden++;
			else
				count++;
		}

		self.tclass(cls + '-empty', !count);
		config.exec && self.SEEX(config.exec, { total: length, hidden: hidden, count: count, search: search, is: true });
	};

	self.setter = function(value) {
		if (!config.selector || !config.attribute || value == null)
			return;
		setTimeout2('search' + self.ID, self.search, config.delay);
	};
});

COMPONENT('largeform', 'zindex:12;padding:30;scrollbar:1;scrolltop:1;style:1', function(self, config, cls) {

	var cls2 = '.' + cls;
	var csspos = {};
	var nav = false;
	var init = false;

	if (!W.$$largeform) {

		W.$$largeform_level = W.$$largeform_level || 1;
		W.$$largeform = true;

		$(document).on('click', cls2 + '-button-close', function() {
			SET($(this).attrd('path'), '');
		});

		var resize = function() {
			setTimeout2(self.name, function() {
				for (var i = 0; i < M.components.length; i++) {
					var com = M.components[i];
					if (com.name === 'largeform' && !HIDDEN(com.dom) && com.$ready && !com.$removed)
						com.resize();
				}
			}, 200);
		};

		ON('resize2', resize);

		$(document).on('click', cls2 + '-container', function(e) {

			if (e.target === this) {
				var com = $(this).component();
				if (com && com.config.closeoutside) {
					com.set('');
					return;
				}
			}

			var el = $(e.target);
			if (el.hclass(cls + '-container') && !el.hclass(cls + '-style-2')) {
				var form = el.find(cls2);
				var c = cls + '-animate-click';
				form.aclass(c);
				setTimeout(function() {
					form.rclass(c);
				}, 300);
			}
		});
	}

	self.readonly();
	self.submit = function() {
		if (config.submit)
			self.EXEC(config.submit, self.hide, self.element);
		else
			self.hide();
	};

	self.cancel = function() {
		config.cancel && self.EXEC(config.cancel, self.hide);
		self.hide();
	};

	self.hide = function() {
		if (config.independent)
			self.hideforce();
		self.esc(false);
		self.set('');
	};

	self.icon = function(value) {
		var el = this.rclass2('fa');
		value.icon && el.aclass(value.icon.indexOf(' ') === -1 ? ('fa fa-' + value.icon) : value.icon);
	};

	self.resize = function() {

		if (self.hclass('hidden'))
			return;

		var padding = isMOBILE ? 0 : config.padding;
		var ui = self.find(cls2);

		csspos.height = WH - (config.style == 1 ? (padding * 2) : padding);
		csspos.top = padding;
		ui.css(csspos);

		var el = self.find(cls2 + '-title');
		var th = el.height();
		csspos = { height: csspos.height - th, width: ui.width() };

		if (nav)
			csspos.height -= nav.height();

		self.find(cls2 + '-body').css(csspos);
		self.scrollbar && self.scrollbar.resize();
		self.element.SETTER('*', 'resize');
	};

	self.make = function() {

		$(document.body).append('<div id="{0}" class="hidden {4}-container invisible"><div class="{4}" style="max-width:{1}px"><div data-bind="@config__text span:value.title__change .{4}-icon:@icon" class="{4}-title"><button name="cancel" class="{4}-button-close{3}" data-path="{2}"><i class="fa fa-times"></i></button><i class="{4}-icon"></i><span></span></div><div class="{4}-body"></div></div>'.format(self.ID, config.width || 800, self.path, config.closebutton == false ? ' hidden' : '', cls));

		var scr = self.find('> script');
		self.template = scr.length ? scr.html().trim() : '';
		scr.length && scr.remove();

		var el = $('#' + self.ID);
		var body = el.find(cls2 + '-body')[0];

		while (self.dom.children.length) {
			var child = self.dom.children[0];
			if (child.tagName === 'NAV') {
				nav = $(child);
				body.parentNode.appendChild(child);
			} else
				body.appendChild(child);
		}

		self.rclass('hidden invisible');
		self.replace(el, true);

		if (config.scrollbar)
			self.scrollbar = SCROLLBAR(self.find(cls2 + '-body'), { visibleY: config.visibleY, orientation: 'y' });

		if (config.style === 2)
			self.aclass(cls + '-style-2');

		self.event('scroll', function() {
			EMIT('scroll', self.name);
			EMIT('reflow', self.name);
		});

		self.event('click', 'button[name]', function() {
			var t = this;
			switch (t.name) {
				case 'submit':
					self.submit(self.hide);
					break;
				case 'cancel':
					!t.disabled && self[t.name](self.hide);
					break;
			}
		});

		config.enter && self.event('keydown', 'input', function(e) {
			e.which === 13 && !self.find('button[name="submit"]')[0].disabled && setTimeout(self.submit, 800);
		});
	};

	self.configure = function(key, value, init, prev) {
		if (!init) {
			switch (key) {
				case 'width':
					value !== prev && self.find(cls2).css('max-width', value + 'px');
					break;
				case 'closebutton':
					self.find(cls2 + '-button-close').tclass('hidden', value !== true);
					break;
			}
		}
	};

	self.esc = function(bind) {
		if (bind) {
			if (!self.$esc) {
				self.$esc = true;
				$(W).on('keydown', self.esc_keydown);
			}
		} else {
			if (self.$esc) {
				self.$esc = false;
				$(W).off('keydown', self.esc_keydown);
			}
		}
	};

	self.esc_keydown = function(e) {
		if (e.which === 27 && !e.isPropagationStopped()) {
			var val = self.get();
			if (!val || config.if === val) {
				e.preventDefault();
				e.stopPropagation();
				self.hide();
			}
		}
	};

	self.hideforce = function() {
		if (!self.hclass('hidden')) {
			self.aclass('hidden');
			self.release(true);
			self.find(cls2).rclass(cls + '-animate');
			W.$$largeform_level--;
		}
	};

	var allowscrollbars = function() {
		$('html').tclass(cls + '-noscroll', !!$(cls2 + '-container').not('.hidden').length);
	};

	self.setter = function(value) {

		setTimeout2(self.name + '-noscroll', allowscrollbars, 50);

		var isHidden = value !== config.if;

		if (self.hclass('hidden') === isHidden) {
			if (!isHidden) {
				config.reload && self.EXEC(config.reload, self);
				config.default && DEFAULT(self.makepath(config.default), true);
				config.scrolltop && self.scrollbar && self.scrollbar.scrollTop(0);
			}
			return;
		}

		setTimeout2(cls, function() {
			EMIT('reflow', self.name);
		}, 10);

		if (isHidden) {
			if (!config.independent)
				self.hideforce();
			return;
		}

		if (self.template) {
			var is = self.template.COMPILABLE();
			self.find(cls2).append(self.template);
			self.template = null;
			is && COMPILE();
		}

		if (W.$$largeform_level < 1)
			W.$$largeform_level = 1;

		W.$$largeform_level++;

		self.css('z-index', W.$$largeform_level * config.zindex);
		self.rclass('hidden');

		self.release(false);
		config.scrolltop && self.scrollbar && self.scrollbar.scrollTop(0);

		config.reload && self.EXEC(config.reload, self);
		config.default && DEFAULT(self.makepath(config.default), true);

		if (!isMOBILE && config.autofocus) {
			setTimeout(function() {
				self.find(typeof(config.autofocus) === 'string' ? config.autofocus : 'input[type="text"],select,textarea').eq(0).focus();
			}, 1000);
		}

		self.resize();

		setTimeout(function() {
			self.rclass('invisible');
			self.find(cls2).aclass(cls + '-animate');
			if (!init && isMOBILE) {
				$('body').aclass('hidden');
				setTimeout(function() {
					$('body').rclass('hidden');
				}, 50);
			}
			init = true;
		}, 300);

		// Fixes a problem with freezing of scrolling in Chrome
		setTimeout2(self.ID, function() {
			self.css('z-index', (W.$$largeform_level * config.zindex) + 1);
		}, 500);

		config.closeesc && self.esc(true);
	};
});

COMPONENT('checkbox', function(self, config, cls) {

	self.nocompile && self.nocompile();

	self.validate = function(value) {
		return (config.disabled || !config.required) ? true : (value === true || value === 'true' || value === 'on');
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'label':
				self.find('span').html(value);
				break;
			case 'required':
				self.find('span').tclass(cls + '-label-required', value);
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				break;
			case 'checkicon':
				self.find('i').rclass2('fa-').aclass('fa-' + value);
				break;
		}
	};

	self.make = function() {
		self.aclass(cls);
		self.html('<div><i class="fa fa-{2}"></i></div><span{1}>{0}</span>'.format(config.label || self.html(), config.required ? (' class="' + cls + '-label-required"') : '', config.checkicon || 'check'));
		config.disabled && self.aclass('ui-disabled');
		self.event('click', function() {
			if (!config.disabled) {
				self.dirty(false);
				self.getter(!self.get());
			}
		});
	};

	self.setter = function(value) {
		var is = config.reverse ? !value : !!value;
		self.tclass(cls + '-checked', is);
	};
});

COMPONENT('input', 'maxlength:200;dirkey:name;dirvalue:id;increment:1;autovalue:name;direxclude:false;forcevalidation:1;searchalign:1;after:\\:', function(self, config, cls) {

	var cls2 = '.' + cls;
	var input, placeholder, dirsource, binded, customvalidator, mask, rawvalue, isdirvisible = false, nobindcamouflage = false, focused = false;

	self.nocompile();
	self.bindvisible(20);

	self.init = function() {
		Thelpers.ui_input_icon = function(val) {
			return val.charAt(0) === '!' || val.indexOf(' ') !== -1 ? ('<span class="ui-input-icon-custom"><i class="' + (val.charAt(0) === '!' ? val.substring(1) : val) + '"></i></span>') : ('<i class="fa fa-' + val + '"></i>');
		};
		W.ui_input_template = Tangular.compile(('{{ if label }}<div class="{0}-label">{{ if icon }}<i class="{{ icon }}"></i>{{ fi }}{{ label | raw }}{{ after | raw }}</div>{{ fi }}<div class="{0}-control{{ if licon }} {0}-licon{{ fi }}{{ if ricon || (type === \'number\' && increment) }} {0}-ricon{{ fi }}">{{ if ricon || (type === \'number\' && increment) }}<div class="{0}-icon-right{{ if type === \'number\' && increment && !ricon }} {0}-increment{{ else if riconclick || type === \'date\' || type === \'time\' || (type === \'search\' && searchalign === 1) || type === \'password\' }} {0}-click{{ fi }}">{{ if type === \'number\' && !ricon }}<i class="fa fa-caret-up"></i><i class="fa fa-caret-down"></i>{{ else }}{{ ricon | ui_input_icon }}{{ fi }}</div>{{ fi }}{{ if licon }}<div class="{0}-icon-left{{ if liconclick || (type === \'search\' && searchalign !== 1) }} {0}-click{{ fi }}">{{ licon | ui_input_icon }}</div>{{ fi }}<div class="{0}-input{{ if align === 1 || align === \'center\' }} center{{ else if align === 2 || align === \'right\' }} right{{ fi }}">{{ if placeholder && !innerlabel }}<div class="{0}-placeholder">{{ placeholder }}</div>{{ fi }}{{ if dirsource || type === \'icon\' || type === \'emoji\' || type === \'color\' }}<div class="{0}-value" tabindex="0"></div>{{ else }}<input type="{{ if type === \'password\' }}password{{ else }}text{{ fi }}"{{ if autofill }} autocomplete="on" name="{{ PATH }}"{{ else }} name="input' + Date.now() + '" autocomplete="new-password"{{ fi }} data-jc-bind=""{{ if maxlength > 0}} maxlength="{{ maxlength }}"{{ fi }}{{ if autofocus }} autofocus{{ fi }} />{{ fi }}</div></div>{{ if error }}<div class="{0}-error hidden"><i class="fa fa-warning"></i> {{ error }}</div>{{ fi }}').format(cls));
	};

	self.make = function() {

		if (!config.label)
			config.label = self.html();

		if (isMOBILE && config.autofocus)
			config.autofocus = false;

		config.PATH = self.path.replace(/\./g, '_');

		self.aclass(cls + ' invisible');
		self.rclass('invisible', 100);
		self.redraw();

		self.event('input change', function() {
			if (nobindcamouflage)
				nobindcamouflage = false;
			else
				self.check();
		});

		self.event('focus', 'input,' + cls2 + '-value', function() {

			if (config.disabled)
				return $(this).blur();

			focused = true;
			self.camouflage(false);
			self.aclass(cls + '-focused');
			config.autocomplete && EXEC(self.makepath(config.autocomplete), self, input.parent());
			if (config.autosource) {
				var opt = {};
				opt.element = self.element;
				opt.search = GET(self.makepath(config.autosource));
				opt.callback = function(value) {
					var val = typeof(value) === 'string' ? value : value[config.autovalue];
					if (config.autoexec) {
						EXEC(self.makepath(config.autoexec), value, function(val) {
							self.set(val, 2);
							self.change();
							self.bindvalue();
						});
					} else {
						self.set(val, 2);
						self.change();
						self.bindvalue();
					}
				};
				SETTER('autocomplete', 'show', opt);
			} else if (config.mask) {
				setTimeout(function(input) {
					input.selectionStart = input.selectionEnd = 0;
				}, 50, this);
			} else if (config.dirsource && (config.autofocus != false && config.autofocus != 0)) {
				if (!isdirvisible)
					self.find(cls2 + '-control').trigger('click');
			}
		});

		self.event('paste', 'input', function(e) {
			if (config.mask) {
				var val = (e.originalEvent.clipboardData || window.clipboardData).getData('text');
				self.set(val.replace(/\s|\t/g, ''));
				e.preventDefault();
			}
		});

		self.event('keydown', 'input', function(e) {

			var t = this;
			var code = e.which;

			if (t.readOnly || config.disabled) {
				// TAB
				if (e.keyCode !== 9) {
					if (config.dirsource) {
						self.find(cls2 + '-control').trigger('click');
						return;
					}
					e.preventDefault();
					e.stopPropagation();
				}
				return;
			}

			if (!config.disabled && config.dirsource && (code === 13 || code > 30)) {
				self.find(cls2 + '-control').trigger('click');
				return;
			}

			if (config.mask) {

				if (e.metaKey) {
					if (code === 8 || code === 127) {
						e.preventDefault();
						e.stopPropagation();
					}
					return;
				}

				if (code === 32) {
					e.preventDefault();
					e.stopPropagation();
					return;
				}

				var beg = e.target.selectionStart;
				var end = e.target.selectionEnd;
				var val = t.value;
				var c;

				if (code === 8 || code === 127) {

					if (beg === end) {
						c = config.mask.substring(beg - 1, beg);
						t.value = val.substring(0, beg - 1) + c + val.substring(beg);
						self.curpos(beg - 1);
					} else {
						for (var i = beg; i <= end; i++) {
							c = config.mask.substring(i - 1, i);
							val = val.substring(0, i - 1) + c + val.substring(i);
						}
						t.value = val;
						self.curpos(beg);
					}

					e.preventDefault();
					return;
				}

				if (code > 40) {

					var cur = String.fromCharCode(code);

					if (mask && mask[beg]) {
						if (!mask[beg].test(cur)) {
							e.preventDefault();
							return;
						}
					}

					c = config.mask.charCodeAt(beg);
					if (c !== 95) {
						beg++;
						while (true) {
							c = config.mask.charCodeAt(beg);
							if (c === 95 || isNaN(c))
								break;
							else
								beg++;
						}
					}

					if (c === 95) {

						val = val.substring(0, beg) + cur + val.substring(beg + 1);
						t.value = val;
						beg++;

						while (beg < config.mask.length) {
							c = config.mask.charCodeAt(beg);
							if (c === 95)
								break;
							else
								beg++;
						}

						self.curpos(beg);
					} else
						self.curpos(beg + 1);

					e.preventDefault();
					e.stopPropagation();
				}
			}

		});

		self.event('blur', 'input', function() {
			focused = false;
			self.camouflage(true);
			self.rclass(cls + '-focused');
		});

		self.event('click', cls2 + '-control', function() {

			if (config.disabled || isdirvisible)
				return;

			if (config.type === 'icon') {
				opt = {};
				opt.element = self.element;
				opt.value = self.get();
				opt.empty = true;
				opt.callback = function(val) {
					self.change(true);
					self.set(val);
					self.check();
					rawvalue.focus();
				};
				SETTER('faicons', 'show', opt);
				return;
			} else if (config.type === 'color') {
				opt = {};
				opt.element = self.element;
				opt.value = self.get();
				opt.empty = true;
				opt.callback = function(al) {
					self.change(true);
					self.set(al);
					self.check();
					rawvalue.focus();
				};
				SETTER('colorpicker', 'show', opt);
				return;
			} else if (config.type === 'emoji') {
				opt = {};
				opt.element = self.element;
				opt.value = self.get();
				opt.empty = true;
				opt.callback = function(al) {
					self.change(true);
					self.set(al);
					self.check();
					rawvalue.focus();
				};
				SETTER('emoji', 'show', opt);
				return;
			}

			if (!config.dirsource)
				return;

			isdirvisible = true;
			setTimeout(function() {
				isdirvisible = false;
			}, 500);

			var opt = {};
			opt.element = self.find(cls2 + '-control');
			opt.items = dirsource || GET(self.makepath(config.dirsource));
			opt.offsetY = -1 + (config.diroffsety || 0);
			opt.offsetX = 0 + (config.diroffsetx || 0);
			opt.placeholder = config.dirplaceholder;
			opt.render = config.dirrender ? GET(self.makepath(config.dirrender)) : null;
			opt.custom = !!config.dircustom;
			opt.offsetWidth = 2;
			opt.minwidth = config.dirminwidth || 200;
			opt.maxwidth = config.dirmaxwidth;
			opt.key = config.dirkey || config.key;
			opt.empty = config.dirempty;

			if (config.dirraw)
				opt.raw = true;

			if (config.dirsearch != null)
				opt.search = config.dirsearch;

			var val = self.get();
			opt.selected = val;

			if (dirsource && config.direxclude == false) {
				for (var i = 0; i < dirsource.length; i++) {
					var item = dirsource[i];
					if (item)
						item.selected = typeof(item) === 'object' && item[config.dirvalue] === val;
				}
			} else if (config.direxclude) {
				opt.exclude = function(item) {
					return item ? item[config.dirvalue] === val : false;
				};
			}

			opt.callback = function(item, el, custom) {

				// empty
				if (item == null) {
					rawvalue.html('');
					self.set(null, 2);
					self.change();
					self.check();
					return;
				}

				var val = custom || typeof(item) === 'string' ? item : item[config.dirvalue || config.value];
				if (custom && typeof(config.dircustom) === 'string') {
					var fn = GET(config.dircustom);
					fn(val, function(val) {
						self.set(val, 2);
						self.change();
						self.bindvalue();
					});
				} else if (custom) {
					if (val) {
						self.set(val, 2);
						self.change();
						if (dirsource)
							self.bindvalue();
						else
							input.val(val);
					}
				} else {
					self.set(val, 2);
					self.change();
					if (dirsource)
						self.bindvalue();
					else
						input.val(val);
				}

				rawvalue.focus();
			};

			SETTER('directory', 'show', opt);
		});

		self.event('click', cls2 + '-placeholder,' + cls2 + '-label', function(e) {
			if (!config.disabled) {
				if (config.dirsource) {
					e.preventDefault();
					e.stopPropagation();
					self.find(cls2 + '-control').trigger('click');
				} else if (!config.camouflage || $(e.target).hclass(cls + '-placeholder')) {
					if (input.length)
						input.focus();
					else
						rawvalue.focus();
				}
			}
		});

		self.event('click', cls2 + '-icon-left,' + cls2 + '-icon-right', function(e) {

			if (config.disabled)
				return;

			var el = $(this);
			var left = el.hclass(cls + '-icon-left');
			var opt;

			if (config.dirsource && left && config.liconclick) {
				e.preventDefault();
				e.stopPropagation();
			}

			if (!left && !config.riconclick) {
				if (config.type === 'date') {
					opt = {};
					opt.element = self.element;
					opt.value = self.get();
					opt.callback = function(val) {
						self.change(true);
						self.set(val);
						input.focus();
					};
					SETTER('datepicker', 'show', opt);
				} else if (config.type === 'time') {
					opt = {};
					opt.element = self.element;
					opt.value = self.get();
					opt.callback = function(val) {
						self.change(true);
						self.set(val);
						input.focus();
					};
					SETTER('timepicker', 'show', opt);
				} else if (config.type === 'search')
					self.set('');
				else if (config.type === 'password')
					self.password();
				else if (config.type === 'number') {
					var tmp = $(e.target);
					if (tmp.attr('class').indexOf('fa-') !== -1) {
						var n = tmp.hclass('fa-caret-up') ? 1 : -1;
						self.change(true);
						var val = self.preparevalue((self.get() || 0) + (config.increment * n));
						self.set(val, 2);
					}
				}
				return;
			}

			if (left && config.liconclick)
				EXEC(self.makepath(config.liconclick), self, el);
			else if (config.riconclick)
				EXEC(self.makepath(config.riconclick), self, el);
			else if (left && config.type === 'search')
				self.set('');

		});
	};

	self.camouflage = function(is) {
		if (config.camouflage) {
			if (is) {
				var t = input[0];
				var arr = t.value.split('');
				for (var i = 0; i < arr.length; i++)
					arr[i] = typeof(config.camouflage) === 'string' ? config.camouflage : '*';
				nobindcamouflage = true;
				t.value = arr.join('');
			} else {
				nobindcamouflage = true;
				var val = self.get();
				input[0].value = val == null ? '' : val;
			}
			self.tclass(cls + '-camouflaged', is);
		}
	};

	self.curpos = function(pos) {
		var el = input[0];
		if (el.createTextRange) {
			var range = el.createTextRange();
			range.move('character', pos);
			range.select();
		} else if (el.selectionStart) {
			el.focus();
			el.setSelectionRange(pos, pos);
		}
	};

	self.validate = function(value) {

		if ((!config.required || config.disabled) && !self.forcedvalidation())
			return true;

		if (config.dirsource)
			return !!value;

		if (customvalidator)
			return customvalidator(value);

		if (self.type === 'date')
			return value instanceof Date && !isNaN(value.getTime());

		if (value == null)
			value = '';
		else
			value = value.toString();

		if (config.mask && typeof(value) === 'string' && value.indexOf('_') !== -1)
			return false;

		if (config.minlength && value.length < config.minlength)
			return false;

		switch (self.type) {
			case 'email':
				return value.isEmail();
			case 'phone':
				return value.isPhone();
			case 'url':
				return value.isURL();
			case 'zip':
				return (/^\d{5}(?:[-\s]\d{4})?$/).test(value);
			case 'currency':
			case 'number':
				value = value.parseFloat();
				if ((config.minvalue != null && value < config.minvalue) || (config.maxvalue != null && value > config.maxvalue))
					return false;
				return config.minvalue == null ? value > 0 : true;
		}

		return value.length > 0;
	};

	self.offset = function() {
		var offset = self.element.offset();
		var control = self.find(cls2 + '-control');
		var width = control.width() + 2;
		return { left: offset.left, top: control.offset().top + control.height(), width: width };
	};

	self.password = function(show) {
		var visible = show == null ? input.attr('type') === 'text' : show;
		input.attr('type', visible ? 'password' : 'text');
		self.find(cls2 + '-icon-right').find('i').tclass(config.ricon, visible).tclass('fa-eye-slash', !visible);
	};

	self.preparevalue = function(value) {

		if (self.type === 'number' && (config.minvalue != null || config.maxvalue != null)) {
			var tmp = typeof(value) === 'string' ? +value.replace(',', '.') : value;
			if (config.minvalue > tmp)
				value = config.minvalue;
			if (config.maxvalue < tmp)
				value = config.maxvalue;
		}

		return value;
	};

	self.getterin = self.getter;
	self.getter = function(value, realtime, nobind) {

		if (nobindcamouflage)
			return;

		if (config.mask && config.masktidy) {
			var val = [];
			for (var i = 0; i < value.length; i++) {
				if (config.mask.charAt(i) === '_')
					val.push(value.charAt(i));
			}
			value = val.join('');
		}

		self.getterin(self.preparevalue(value), realtime, nobind);
	};

	self.setterin = self.setter;

	self.setter = function(value, path, type) {

		if (config.mask) {
			if (value) {
				if (config.masktidy) {
					var index = 0;
					var val = [];
					for (var i = 0; i < config.mask.length; i++) {
						var c = config.mask.charAt(i);
						val.push(c === '_' ? (value.charAt(index++) || '_') : c);
					}
					value = val.join('');
				}

				// check values
				if (mask) {
					var arr = [];
					for (var i = 0; i < mask.length; i++) {
						var c = value.charAt(i);
						if (mask[i] && mask[i].test(c))
							arr.push(c);
						else
							arr.push(config.mask.charAt(i));
					}
					value = arr.join('');
				}
			} else
				value = config.mask;
		}

		self.setterin(value, path, type);
		self.bindvalue();

		config.camouflage && !focused && setTimeout(self.camouflage, type === 1 ? 1000 : 1, true);

		if (config.type === 'password')
			self.password(true);
	};

	self.check = function() {

		var is = input.length ? !!input[0].value : !!self.get();

		if (binded === is)
			return;

		binded = is;
		placeholder && placeholder.tclass('hidden', is);
		self.tclass(cls + '-binded', is);

		if (config.type === 'search')
			self.find(cls2 + '-icon-' + (config.searchalign === 1 ? 'right' : 'left')).find('i').tclass(config.searchalign === 1 ? config.ricon : config.licon, !is).tclass('fa-times', is);
	};

	self.bindvalue = function() {

		var value = self.get();

		if (dirsource) {

			var item;

			for (var i = 0; i < dirsource.length; i++) {
				item = dirsource[i];
				if (typeof(item) === 'string') {
					if (item === value)
						break;
					item = null;
				} else if (item[config.dirvalue || config.value] === value) {
					item = item[config.dirkey || config.key];
					break;
				} else
					item = null;
			}

			if (value && item == null && config.dircustom)
				item = value;

			if (config.dirraw)
				rawvalue.html(item || '');
			else
				rawvalue.text(item || '');

		} else if (config.dirsource)
			if (config.dirraw)
				rawvalue.html(value || '');
			else
				rawvalue.text(value || '');
		else {
			switch (config.type) {
				case 'color':
					rawvalue.css('background-color', value || '');
					break;
				case 'icon':
					rawvalue.html('<i class="{0}"></i>'.format(value || ''));
					break;
				case 'emoji':
					rawvalue.html(value);
					break;
			}
		}

		self.check();
	};

	self.redraw = function() {

		if (!config.ricon) {
			if (config.dirsource)
				config.ricon = 'angle-down';
			else if (config.type === 'date') {
				config.ricon = 'calendar';
				if (!config.align && !config.innerlabel)
					config.align = 1;
			} else if (config.type === 'icon' || config.type === 'color' || config.type === 'emoji') {
				config.ricon = 'angle-down';
				if (!config.align && !config.innerlabel)
					config.align = 1;
			} else if (config.type === 'time') {
				config.ricon = 'clock-o';
				if (!config.align && !config.innerlabel)
					config.align = 1;
			} else if (config.type === 'search')
				if (config.searchalign === 1)
					config.ricon = 'search';
				else
					config.licon = 'search';
			else if (config.type === 'password')
				config.ricon = 'eye';
			else if (config.type === 'number') {
				if (!config.align && !config.innerlabel)
					config.align = 1;
			}
		}

		self.tclass(cls + '-masked', !!config.mask);
		self.rclass2(cls + '-type-');

		if (config.type)
			self.aclass(cls + '-type-' + config.type);

		self.html(W.ui_input_template(config));
		input = self.find('input');
		rawvalue = self.find(cls2 + '-value');
		placeholder = self.find(cls2 + '-placeholder');
	};

	self.configure = function(key, value) {
		switch (key) {
			case 'icon':
				if (value && value.indexOf(' ') === -1)
					config.icon = 'fa fa-' + value;
				break;
			case 'dirsource':
				if (config.dirajax || value.indexOf('/') !== -1) {
					dirsource = null;
					self.bindvalue();
				} else {
					if (value.indexOf(',') !== -1) {
						dirsource = self.parsesource(value);
						self.bindvalue();
					} else {
						self.datasource(value, function(path, value) {
							dirsource = value;
							self.bindvalue();
						});
					}
				}
				self.tclass(cls + '-dropdown', !!value);
				input.prop('readonly', !!config.disabled || !!config.dirsource);
				break;
			case 'disabled':
				self.tclass('ui-disabled', !!value);
				input.prop('readonly', !!value || !!config.dirsource);
				self.reset();
				break;
			case 'required':
				self.tclass(cls + '-required', !!value);
				self.reset();
				break;
			case 'type':
				self.type = value;
				break;
			case 'validate':
				customvalidator = value ? (/\(|=|>|<|\+|-|\)/).test(value) ? FN('value=>' + value) : (function(path) { path = self.makepath(path); return function(value) { return GET(path)(value); }; })(value) : null;
				break;
			case 'innerlabel':
				self.tclass(cls + '-inner', !!value);
				break;
			case 'monospace':
				self.tclass(cls + '-monospace', !!value);
				break;
			case 'maskregexp':
				if (value) {
					mask = value.toLowerCase().split(',');
					for (var i = 0; i < mask.length; i++) {
						var m = mask[i];
						if (!m || m === 'null')
							mask[i] = '';
						else
							mask[i] = new RegExp(m);
					}
				} else
					mask = null;
				break;
			case 'mask':
				config.mask = value.replace(/#/g, '_');
				break;
		}
	};

	self.formatter(function(path, value) {
		if (value) {
			switch (config.type) {
				case 'lower':
					return (value + '').toLowerCase();
				case 'upper':
					return (value + '').toUpperCase();
				case 'phone':
					return (value + '').replace(/\s/g, '');
				case 'email':
					return (value + '').toLowerCase();
				case 'date':
					return value.format(config.format || 'yyyy-MM-dd');
				case 'time':
					return value.format(config.format || 'HH:mm');
				case 'number':
					return config.format ? value.format(config.format) : value;
			}
		}

		return value;
	});

	self.parser(function(path, value) {
		if (value) {
			var tmp;
			switch (config.type) {
				case 'date':
					tmp = self.get();
					if (tmp)
						tmp = tmp.format('HH:mm');
					else
						tmp = '';
					return value + (tmp ? (' ' + tmp) : '');
				case 'lower':
				case 'email':
					value = value.toLowerCase();
					break;
				case 'upper':
					value = value.toUpperCase();
					break;
				case 'phone':
					value = value.replace(/\s/g, '');
					break;
				case 'time':
					tmp = value.split(':');
					var dt = self.get();
					if (dt == null)
						dt = new Date();
					dt.setHours(+(tmp[0] || '0'));
					dt.setMinutes(+(tmp[1] || '0'));
					dt.setSeconds(+(tmp[2] || '0'));
					value = dt;
					break;
			}
		}
		return value ? config.spaces === false ? value.replace(/\s/g, '') : value : value;
	});

	self.state = function(type) {
		if (type) {
			var invalid = config.required ? self.isInvalid() : self.forcedvalidation() ? self.isInvalid() : false;
			if (invalid === self.$oldstate)
				return;
			self.$oldstate = invalid;
			self.tclass(cls + '-invalid', invalid);
			config.error && self.find(cls2 + '-error').tclass('hidden', !invalid);
		}
	};

	self.forcedvalidation = function() {

		if (!config.forcevalidation)
			return false;

		if (self.type === 'number')
			return false;

		var val = self.get();
		return (self.type === 'phone' || self.type === 'email') && (val != null && (typeof(val) === 'string' && val.length !== 0));
	};

});

COMPONENT('validation', 'delay:100;flags:visible', function(self, config, cls) {

	var path, elements = null;
	var def = 'button[name="submit"]';
	var flags = null;
	var tracked = false;
	var reset = 0;
	var old, track;

	self.readonly();

	self.make = function() {
		elements = self.find(config.selector || def);
		path = self.path.replace(/\.\*$/, '');
	};

	self.configure = function(key, value, init) {
		switch (key) {
			case 'selector':
				if (!init)
					elements = self.find(value || def);
				break;
			case 'flags':
				if (value) {
					flags = value.split(',');
					for (var i = 0; i < flags.length; i++)
						flags[i] = '@' + flags[i];
				} else
					flags = null;
				break;
			case 'track':
				track = value.split(',').trim();
				break;
		}
	};

	var settracked = function() {
		tracked = 0;
	};

	self.setter = function(value, path, type) {

		var is = path === self.path || path.length < self.path.length;

		if (reset !== is) {
			reset = is;
			self.tclass(cls + '-modified', !reset);
		}

		if ((type === 1 || type === 2) && track && track.length) {
			for (var i = 0; i < track.length; i++) {
				if (path.indexOf(track[i]) !== -1) {
					tracked = 1;
					return;
				}
			}
			if (tracked === 1) {
				tracked = 2;
				setTimeout(settracked, config.delay * 3);
			}
		}
	};

	var check = function() {
		var disabled = tracked ? !VALID(path, flags) : DISABLED(path, flags);
		if (!disabled && config.if)
			disabled = !EVALUATE(self.path, config.if);
		if (disabled !== old) {
			elements.prop('disabled', disabled);
			self.tclass(cls + '-ok', !disabled);
			self.tclass(cls + '-no', disabled);
			old = disabled;
		}
	};

	self.state = function(type, what) {
		if (type === 3 || what === 3)
			tracked = 0;
		setTimeout2(self.ID, check, config.delay);
	};

});

COMPONENT('menu', function(self, config, cls) {

	self.singleton();
	self.readonly();
	self.nocompile && self.nocompile();

	var cls2 = '.' + cls;

	var is = false;
	var issubmenu = false;
	var isopen = false;
	var events = {};
	var ul, children, prevsub, parentclass;

	self.make = function() {
		self.aclass(cls + ' hidden ' + cls + '-style-' + (config.style || 1));
		self.append('<div class="{0}-items"><ul></ul></div><div class="{0}-submenu hidden"><ul></ul></div>'.format(cls));
		ul = self.find(cls2 + '-items').find('ul');
		children = self.find(cls2 + '-submenu');

		self.event('click', 'li', function(e) {

			clearTimeout2(self.ID);

			var el = $(this);
			if (!el.hclass(cls + '-divider') && !el.hclass(cls + '-disabled')) {
				self.opt.scope && M.scope(self.opt.scope);
				var index = el.attrd('index').split('-');
				if (index.length > 1) {
					// submenu
					self.opt.callback(self.opt.items[+index[0]].children[+index[1]]);
					self.hide();
				} else if (!issubmenu) {
					self.opt.callback(self.opt.items[+index[0]]);
					self.hide();
				}
			}

			e.preventDefault();
			e.stopPropagation();
		});

		events.hide = function() {
			is && self.hide();
		};

		self.event('scroll', events.hide);
		self.on('reflow + scroll + resize + resize2', events.hide);

		events.click = function(e) {
			if (is && !isopen && (!self.target || (self.target !== e.target && !self.target.contains(e.target))))
				setTimeout2(self.ID, self.hide, isMOBILE ? 700 : 300);
		};

		events.hidechildren = function() {
			if ($(this.parentNode.parentNode).hclass(cls + '-items')) {
				if (prevsub && prevsub[0] !== this) {
					prevsub.rclass(cls + '-selected');
					prevsub = null;
					children.aclass('hidden');
					issubmenu = false;
				}
			}
		};

		events.children = function() {

			if (prevsub && prevsub[0] !== this) {
				prevsub.rclass(cls + '-selected');
				prevsub = null;
			}

			issubmenu = true;
			isopen = true;

			setTimeout(function() {
				isopen = false;
			}, 500);

			var el = prevsub = $(this);
			var index = +el.attrd('index');
			var item = self.opt.items[index];

			el.aclass(cls + '-selected');

			var html = self.makehtml(item.children, index);
			children.find('ul').html(html);
			children.rclass('hidden');

			var css = {};
			var offset = el.position();

			css.left = ul.width() - 5;
			css.top = offset.top - 5;

			var offsetX = offset.left;

			offset = self.element.offset();

			var w = children.width();
			var left = offset.left + css.left + w;
			if (left > WW + 30)
				css.left = (offsetX - w) + 5;

			children.css(css);
		};
	};

	self.bindevents = function() {
		events.is = true;
		$(document).on('touchstart mouseenter mousedown', cls2 + '-children', events.children).on('touchstart mousedown', events.click);
		$(W).on('scroll', events.hide);
		self.element.on('mouseenter', 'li', events.hidechildren);
	};

	self.unbindevents = function() {
		events.is = false;
		$(document).off('touchstart mouseenter mousedown', cls2 + '-children', events.children).off('touchstart mousedown', events.click);
		$(W).off('scroll', events.hide);
		self.element.off('mouseenter', 'li', events.hidechildren);
	};

	self.showxy = function(x, y, items, callback) {
		var opt = {};
		opt.x = x;
		opt.y = y;
		opt.items = items;
		opt.callback = callback;
		self.show(opt);
	};

	self.makehtml = function(items, index) {
		var builder = [];
		var tmp;

		for (var i = 0; i < items.length; i++) {
			var item = items[i];

			if (typeof(item) === 'string') {
				// caption or divider
				if (item === '-')
					tmp = '<hr />';
				else
					tmp = '<span>{0}</span>'.format(item);
				builder.push('<li class="{0}-divider">{1}</li>'.format(cls, tmp));
				continue;
			}

			var cn = item.classname || '';
			var icon = '';

			if (item.icon)
				icon = '<i class="{0}"></i>'.format(item.icon.charAt(0) === '!' ? item.icon.substring(1) : item.icon.indexOf('fa-') === -1 ? ('fa fa-' + item.icon) : item.icon);
			else
				cn = (cn ? (cn + ' ') : '') + cls + '-nofa';

			tmp = '';

			if (index == null && item.children && item.children.length) {
				cn += (cn ? ' ' : '') + cls + '-children';
				tmp += '<i class="fa fa-play pull-right"></i>';
			}

			if (item.selected)
				cn += (cn ? ' ' : '') + cls + '-selected';

			if (item.disabled)
				cn += (cn ? ' ' : '') + cls + '-disabled';

			tmp += '<div class="{0}-name">{1}{2}{3}</div>'.format(cls, icon, item.name, item.shortcut ? '<b>{0}</b>'.format(item.shortcut) : '');

			if (item.note)
				tmp += '<div class="ui-menu-note">{0}</div>'.format(item.note);

			builder.push('<li class="{0}" data-index="{2}">{1}</li>'.format(cn, tmp, (index != null ? (index + '-') : '') + i));
		}

		return builder.join('');
	};

	self.show = function(opt) {

		if (typeof(opt) === 'string') {
			// old version
			opt = { align: opt };
			opt.element = arguments[1];
			opt.items = arguments[2];
			opt.callback = arguments[3];
			opt.offsetX = arguments[4];
			opt.offsetY = arguments[5];
		}

		var tmp = opt.element ? opt.element instanceof jQuery ? opt.element[0] : opt.element.element ? opt.element.dom : opt.element : null;

		if (is && tmp && self.target === tmp) {
			self.hide();
			return;
		}

		var tmp;

		self.target = tmp;
		self.opt = opt;
		opt.scope = M.scope();

		if (parentclass && opt.classname !== parentclass) {
			self.rclass(parentclass);
			parentclass = null;
		}

		if (opt.large)
			self.aclass('ui-large');
		else
			self.rclass('ui-large');

		isopen = false;
		issubmenu = false;
		prevsub = null;

		var css = {};
		children.aclass('hidden');
		children.find('ul').empty();
		clearTimeout2(self.ID);

		ul.html(self.makehtml(opt.items));

		if (!parentclass && opt.classname) {
			self.aclass(opt.classname);
			parentclass = opt.classname;
		}

		if (is) {
			css.left = 0;
			css.top = 0;
			self.element.css(css);
		} else {
			self.rclass('hidden');
			self.aclass(cls + '-visible', 100);
			is = true;
			if (!events.is)
				self.bindevents();
		}

		var target = $(opt.element);
		var w = self.width();
		var offset = target.offset();

		if (opt.element) {
			switch (opt.align) {
				case 'center':
					css.left = Math.ceil((offset.left - w / 2) + (target.innerWidth() / 2));
					break;
				case 'right':
					css.left = (offset.left - w) + target.innerWidth();
					break;
				default:
					css.left = offset.left;
					break;
			}

			css.top = opt.position === 'bottom' ? (offset.top - self.element.height() - 10) : (offset.top + target.innerHeight() + 10);

		} else {
			css.left = opt.x;
			css.top = opt.y;
		}

		if (opt.offsetX)
			css.left += opt.offsetX;

		if (opt.offsetY)
			css.top += opt.offsetY;

		var mw = w;
		var mh = self.height();

		if (css.left < 0)
			css.left = 10;
		else if ((mw + css.left) > WW)
			css.left = (WW - mw) - 10;

		if (css.top < 0)
			css.top = 10;
		else if ((mh + css.top) > WH)
			css.top = (WH - mh) - 10;

		self.element.css(css);
	};

	self.hide = function() {
		events.is && self.unbindevents();
		is = false;
		self.opt && self.opt.hide && self.opt.hide();
		self.target = null;
		self.opt = null;
		self.aclass('hidden');
		self.rclass(cls + '-visible');
	};

});

COMPONENT('contenteditable', function(self) {

	var timers = {};
	var current = { bold: false, underline: false, italic: false, focused: false, node: null };
	var required = self.attrd('required') === 'true';

	self.validate = function(value) {
		var type = typeof(value);

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);
		return value.length > 0;
	};

	!required && self.noValid();

	self.make = function() {

		self.attr('contenteditable', 'true');
		self.aclass('ui-contenteditable');

		var el = self.element;

		el.on('selectstart', function() {
			clearTimeout(timers.selection);
			timers.selection = setTimeout(function() {
				self.event('select', self.getSelection());
			}, 500);
		});

		el.on('focus', function() {
			clearTimeout(timers.focused);
			clearInterval(timers.changes);
			self.focused = true;
			self.event('focus', self);
			timers.changes = setInterval(self.save, 1000);
		});

		self.save = function() {
			self.getter(self.html());
		};

		el.on('click', function(e) {
			e.target && self.event('click', e.target);
		});

		el.on('blur', function() {
			clearTimeout(timers.focused);
			clearInterval(timers.changes);
			self.save();
			timers.focused = setTimeout(function() {
				self.event('blur', self);
				self.reset(true);
			}, 200);
		});

		el.on('paste', function(e) {
			e.preventDefault();
			e.stopPropagation();
			var text = e.originalEvent.clipboardData.getData(self.attrd('clipboard') || 'text/plain');
			self.event('paste', text);
		});

		el.on('keydown', function(e) {

			clearTimeout(timers.keypress);
			timers.keypress = setTimeout(function() {
				var node = self.getNode();
				if (node === self.element[0])
					node = undefined;
				if (current.node === node)
					return;
				current.node = node;
				self.event('current', node);
			}, 100);

			if (!e.metaKey && !e.ctrlKey)
				return;

			if (e.which === 66) {
				// bold
				current.bold = !current.bold;
				document.execCommand('Bold', false, null);
				self.event('bold', current.bold);
				e.preventDefault();
				e.stopPropagation();
				return;
			}

			if (e.which === 76) {
				// link
				e.preventDefault();
				e.stopPropagation();

				var html = self.getSelection();
				if (html) {
					var id = '#URL' + Date.now();
					document.execCommand('CreateLink', false, id);
					var a = self.find('a[href="{0}"]'.format(id)).attr('target', '_blank').attr('href', html);
					self.event('link', a);
				}
				return;
			}

			if (e.which === 73) {
				// italic
				current.italic = !current.italic;
				document.execCommand('Italic', false, null);
				self.event('italic', current.italic);
				e.preventDefault();
				e.stopPropagation();
				return;
			}

			if (e.which === 85) {
				// underline
				current.underline = !current.underline;
				document.execCommand('Underline', false, null);
				self.event('underline', current.underline);
				e.preventDefault();
				e.stopPropagation();
				return;
			}
		});
	};

	self.reset = function() {
		var keys = Object.keys(current);
		for (var i = 0, length = keys.length; i < length; i++) {
			var key = keys[i];
			switch (key) {
				case 'focused':
					break;
				case 'node':
					current[key] = null;
					break;
				default:
					if (current[key] === false)
						break;
					current[key] = false;
					self.event(key, false);
					break;
			}
		}
	};

	self.exec = function() {
		document.execCommand.apply(document, arguments);
		return self;
	};

	self.insert = function(value, encoded) {
		document.execCommand(encoded ? 'insertText' : 'insertHtml', false, value);
		return self;
	};

	self.event = function(type, value) {

		// type = bold          - when a text is bolded (value is boolean)
		// type = italic        - when a text is italic (value is boolean)
		// type = underline     - when a text is underlined (value is boolean)
		// type = link          - when a link is created (value is a temporary URL)
		// type = current       - when a current element is changed in the text (value is NODE)
		// type = paste         - when the clipboard is used (value is a clipboard value)
		// type = select        - when a text is selected (value is selected text)
		// type = focus         - editor is focused (value is undefined)
		// type = blur          - editor is not focused (value is undefined)
		// type = click         - click on the specific element in the text (value is NODE)

		if (type === 'paste')
			self.insert(value, true);
	};

	self.getNode = function() {
		var node = document.getSelection().anchorNode;
		if (node)
			return (node.nodeType === 3 ? node.parentNode : node);
	};

	self.getSelection = function() {
		if (document.selection && document.selection.type === 'Text')
			return document.selection.createRange().htmlText;
		else if (!window.getSelection)
			return;
		var sel = window.getSelection();
		if (!sel.rangeCount)
			return '';
		var container = document.createElement('div');
		for (var i = 0, len = sel.rangeCount; i < len; ++i)
			container.appendChild(sel.getRangeAt(i).cloneContents());
		return container.innerHTML;
	};

	self.setter = function(value, path, type) {
		if (type === 2)
			return;
		self.reset();
		self.html(value ? value.toString() : '');
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.toggle('ui-contenteditable-invalid', invalid);
	};
});

COMPONENT('radiobuttonexpert', function(self, config, cls) {

	var cls2 = '.' + cls;
	var template;
	var recompile = false;
	var selected;
	var reg = /\$(index|path)/g;

	self.nocompile();

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				break;
			case 'required':
				self.find(cls2 + '-label').tclass(cls + '-label-required', value);
				break;
			case 'type':
				self.type = config.type;
				break;
			case 'label':
				self.find(cls2 + '-label').html(value);
				break;
			case 'datasource':
				if (value.indexOf(',') === -1)
					self.datasource(value, self.bind);
				else
					self.bind('', self.parsesource(value));
				break;
		}
	};

	self.make = function() {

		var element = self.find('script');
		if (!element.length)
			return;

		var html = element.html();
		element.remove();
		html = html.replace('>', ' data-value="{{ {0} }}" data-disabled="{{ {1} }}">'.format(config.value || 'id', config.disabledkey || 'disabled'));
		template = Tangular.compile(html);
		recompile = html.COMPILABLE();

		config.label && self.html('<div class="' + cls + '-label{1}">{0}</div>'.format(config.label, config.required ? (' ' + cls + '-label-required') : ''));
		config.datasource && self.reconfigure('datasource:' + config.datasource);
		config.type && (self.type = config.type);
		config.disabled && self.aclass('ui-disabled');

		self.event('click', '[data-value]', function() {
			var el = $(this);
			if (config.disabled || +el.attrd('disabled'))
				return;
			var value = self.parser(el.attrd('value'));
			self.set(value);
			self.change(true);
		});
	};

	self.validate = function(value) {
		return (config.disabled || !config.required) ? true : !!value;
	};

	self.setter = function(value) {

		selected && selected.rclass('selected');

		if (value == null)
			return;

		var el = self.find('[data-value="' + value + '"]');
		if (el) {
			el.aclass('selected');
			selected = el;
		}
	};

	self.bind = function(path, arr) {

		if (!arr)
			arr = EMPTYARRAY;

		var builder = [];
		var disabledkey = config.disabledkey || 'disabled';

		for (var i = 0; i < arr.length; i++) {
			var item = arr[i];
			item[disabledkey] = +item[disabledkey] || 0;
			builder.push(template(item).replace(reg, function(text) {
				return text.substring(0, 2) === '$i' ? i.toString() : self.path + '[' + i + ']';
			}));
		}

		var render = builder.join('');
		self.find(cls2 + '-container').remove();
		self.append('<div class="{0}-container{1}">{2}</div>'.format(cls, config.class ? ' ' + config.class : '', render));
		self.refresh();
		recompile && self.compile();
	};

});

COMPONENT('checkboxlistexpert', function(self, config, cls) {

	var cls2 = '.' + cls;
	var recompile = false;
	var datasource;
	var reg = /\$(index|path)/g;

	self.nocompile();

	self.configure = function(key, value, init) {

		if (init)
			return;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				break;
			case 'required':
				self.find(cls2 + '-label').tclass(cls + '-label-required', value);
				break;
			case 'type':
				self.type = config.type;
				break;
			case 'label':
				self.find(cls2 + '-label').html(value);
				break;
			case 'datasource':
				if (value.indexOf(',') === -1)
					self.datasource(value, self.bind);
				else
					self.bind('', self.parsesource(value));
				break;
		}
	};

	self.make = function() {

		var el = self.find('script');

		if (!el.length)
			return;

		var html = el.html();
		self.template = Tangular.compile(html.replace('>', ' data-index="$index" data-disabled="{{ {0} }}">'.format(config.disabledkey || 'disabled')));
		recompile = html.COMPILABLE();

		el.remove();
		config.label && self.html('<div class="' + cls + '-label{1}">{0}</div>'.format(config.label, config.required ? (' ' + cls + '-label-required') : ''));
		config.datasource && self.reconfigure('datasource:' + config.datasource);
		config.type && (self.type = config.type);
		config.disabled && self.aclass('ui-disabled');

		self.event('click', '[data-index]', function() {
			var el = $(this);

			if (config.disabled || +el.attrd('disabled'))
				return;

			var key = config.value || 'id';
			var index = +el.attrd('index');
			var data = self.get() || [];
			var val = datasource[index] ? datasource[index][key] : null;
			var valindex = data.indexOf(val);

			if (valindex === -1) {
				self.push(val);
			} else {
				data.splice(valindex, 1);
				self.set(data);
			}

			self.change(true);
		});
	};

	self.validate = function(value) {
		return config.disabled || !config.required ? true : !!value;
	};

	self.setter = function(value) {

		var key = config.value || 'id';

		if (value && !(value instanceof Array)) {
			self.set([value]);
			return;
		}

		self.find('[data-index]').each(function() {
			var el = $(this);
			var index = +el.attrd('index');
			var selected = false;
			if (value && value.length) {
				var val = datasource[index][key];
				selected = value.indexOf(val) !== -1;
			}
			el.tclass('selected', selected);
		});
	};

	self.bind = function(path, arr) {

		if (!arr)
			arr = EMPTYARRAY;

		var builder = [];
		datasource = [];

		var disabledkey = config.disabledkey || 'disabled';

		for (var i = 0; i < arr.length; i++) {
			var item = arr[i];
			item[disabledkey] = +item[disabledkey] || 0;
			datasource.push(item);
			builder.push(self.template(item).replace(reg, function(text) {
				return text.substring(0, 2) === '$i' ? i.toString() : self.path + '[' + i + ']';
			}));
		}

		self.find(cls2 + '-container').remove();
		self.append('<div class="{0}-container{1}">{2}</div>'.format(cls, config.class ? ' ' + config.class : '', builder.join('')));
		self.refresh();
		recompile && self.compile();
	};
});

COMPONENT('movable', function(self, config) {

	var events = {};
	var draggable;

	self.readonly();

	self.make = function() {
		var target = config.global ? $(document) : config.parent ? self.parent(config.parent) : self.element;
		target.on('dragenter dragover dragexit drop dragleave dragstart', config.selector, events.ondrag).on('mousedown', config.selector, events.ondown);
	};

	events.ondrag = function(e) {

		if (!draggable)
			return;

		if (e.type !== 'dragstart') {
			e.stopPropagation();
			e.preventDefault();
		}

		switch (e.type) {
			case 'drop':

				var parent = draggable.parentNode;
				var a = draggable;
				var b = e.target;
				var ai = -1;
				var bi = -1;
				var is = false;

				while (true) {
					if (b.parentNode === parent) {
						is = true;
						break;
					}
					b = b.parentNode;
					if (b == null || b.tagName === 'HTML')
						break;
				}

				if (a === b || !is)
					return;

				for (var i = 0; i < parent.children.length; i++) {
					var child = parent.children[i];
					if (a === child)
						ai = i;
					else if (b === child)
						bi = i;
					if (bi !== -1 && ai !== -1)
						break;
				}

				if (ai > bi)
					parent.insertBefore(a, b);
				else
					parent.insertBefore(a, b.nextSibling);

				config.exec && EXEC(self.makepath(config.exec), $(parent).find(config.selector), a, b);
				self.path && self.change(true);
				break;

			case 'dragstart':
				var eo = e.originalEvent;
				eo.dataTransfer && eo.dataTransfer.setData('text', '1');
				break;
			case 'dragenter':
			case 'dragover':
			case 'dragexit':
			case 'dragleave':
				break;
		}
	};

	events.ondown = function() {
		draggable = this;
	};

	self.destroy = function() {
		$(document).off('dragenter dragover dragexit drop dragleave dragstart', config.selector, events.ondrag).off('mousedown', config.selector, events.ondown);
	};
});

COMPONENT('colorselector', 'colors:#DA4453,#E9573F,#F6BB42,#61C83B,#37BC9B,#3BAFDA,#4A89DC,#967ADC,#D770AD,#656D7D;empty:true', function(self, config) {

	var selected, list, content, colors = null;

	self.nocompile && self.nocompile();

	self.validate = function(value) {
		return config.disabled || !config.required ? true : colors.indexOf(value) === -1;
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		var redraw = false;
		switch (key) {
			case 'required':
				self.find('.ui-colorselector-label').tclas('.ui-colorselector-required', value);
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				break;
			case 'colors':
				colors = value.split(',').trim();
				break;
			case 'label':
			case 'icon':
				redraw = true;
				break;
		}

		redraw && setTimeout2('redraw.' + self.id, function() {
			self.redraw();
			self.refresh();
		}, 100);
	};

	self.redraw = function() {
		var builder = [];
		var label = config.label || content;
		label && builder.push('<div class="ui-colorselector-label{1}">{2}{0}</div>'.format(label, config.required ? ' ui-colorselector-required' : '', config.icon ? '<i class="fa fa-{0}"></i>'.format(config.icon) : ''));
		builder.push('<ul class="ui-colorselector">');

		for (var i = 0, length = colors.length; i < length; i++) {
			var color = colors[i];
			color && builder.push('<li data-index="{0}" style="background-color:{1}"></li>'.format(i, color));
		}

		builder.push('</ul>');
		self.html(builder.join(''));
		self.tclass('ui-disabled', config.disabled);
		list = self.find('li');
	};

	self.make = function() {
		colors = config.colors.split(',').trim();
		self.redraw();
		self.event('click', 'li', function() {
			if (config.disabled)
				return;
			var color = colors[+this.getAttribute('data-index')];
			if (!config.required && color === self.get())
				color = '';
			self.change(true);
			self.set(color);
		});
	};

	self.setter = function(value) {
		var index = colors.indexOf(value);
		selected && selected.rclass('selected');
		if (index !== -1) {
			selected = list.eq(index);
			selected.aclass('selected');
		}
	};
});

COMPONENT('form', 'zindex:12;scrollbar:1', function(self, config, cls) {

	var cls2 = '.' + cls;
	var container;
	var csspos = {};

	if (!W.$$form) {

		W.$$form_level = W.$$form_level || 1;
		W.$$form = true;

		$(document).on('click', cls2 + '-button-close', function() {
			SET($(this).attrd('path'), '');
		});

		var resize = function() {
			setTimeout2('form', function() {
				for (var i = 0; i < M.components.length; i++) {
					var com = M.components[i];
					if (com.name === 'form' && !HIDDEN(com.dom) && com.$ready && !com.$removed)
						com.resize();
				}
			}, 200);
		};

		ON('resize2', resize);

		$(document).on('click', cls2 + '-container', function(e) {

			var el = $(e.target);
			if (e.target === this || el.hclass(cls + '-container-padding')) {
				var com = $(this).component();
				if (com && com.config.closeoutside) {
					com.set('');
					return;
				}
			}

			if (!(el.hclass(cls + '-container-padding') || el.hclass(cls + '-container')))
				return;

			var form = $(this).find(cls2);
			var c = cls + '-animate-click';
			form.aclass(c);

			setTimeout(function() {
				form.rclass(c);
			}, 300);
		});
	}

	self.readonly();
	self.submit = function() {
		if (config.submit)
			self.EXEC(config.submit, self.hide, self.element);
		else
			self.hide();
	};

	self.cancel = function() {
		config.cancel && self.EXEC(config.cancel, self.hide);
		self.hide();
	};

	self.hide = function() {
		if (config.independent)
			self.hideforce();
		self.esc(false);
		self.set('');
	};

	self.icon = function(value) {
		var el = this.rclass2('fa');
		value.icon && el.aclass(value.icon.indexOf(' ') === -1 ? ('fa fa-' + value.icon) : value.icon);
		el.tclass('hidden', !value.icon);
	};

	self.resize = function() {

		if (self.scrollbar) {
			container.css('height', WH);
			self.scrollbar.resize();
		}

		if (!config.center || self.hclass('hidden'))
			return;

		var ui = self.find(cls2);
		var fh = ui.innerHeight();
		var wh = WH;
		var r = (wh / 2) - (fh / 2);
		csspos.marginTop = (r > 30 ? (r - 15) : 20) + 'px';
		ui.css(csspos);
	};

	self.make = function() {

		$(document.body).append('<div id="{0}" class="hidden {4}-container invisible"><div class="{4}-scrollbar"><div class="{4}-container-padding"><div class="{4}" style="max-width:{1}px"><div data-bind="@config__text span:value.title__change .{4}-icon:@icon" class="{4}-title"><button name="cancel" class="{4}-button-close{3}" data-path="{2}"><i class="fa fa-times"></i></button><i class="{4}-icon"></i><span></span></div></div></div></div>'.format(self.ID, config.width || 800, self.path, config.closebutton == false ? ' hidden' : '', cls));

		var scr = self.find('> script');
		self.template = scr.length ? scr.html().trim() : '';
		if (scr.length)
			scr.remove();

		var el = $('#' + self.ID);
		var body = el.find(cls2)[0];
		container = el.find(cls2 + '-scrollbar');

		if (config.scrollbar) {
			el.css('overflow', 'hidden');
			self.scrollbar = SCROLLBAR(el.find(cls2 + '-scrollbar'), { visibleY: 1, orientation: 'y' });
		}

		while (self.dom.children.length)
			body.appendChild(self.dom.children[0]);

		self.rclass('hidden invisible');
		self.replace(el, true);

		self.event('scroll', function() {
			EMIT('scroll', self.name);
			EMIT('reflow', self.name);
		});

		self.event('click', 'button[name]', function() {
			var t = this;
			switch (t.name) {
				case 'submit':
					self.submit(self.hide);
					break;
				case 'cancel':
					!t.disabled && self[t.name](self.hide);
					break;
			}
		});

		config.enter && self.event('keydown', 'input', function(e) {
			e.which === 13 && !self.find('button[name="submit"]')[0].disabled && setTimeout(self.submit, 800);
		});
	};

	self.configure = function(key, value, init, prev) {
		if (init)
			return;
		switch (key) {
			case 'width':
				value !== prev && self.find(cls2).css('max-width', value + 'px');
				break;
			case 'closebutton':
				self.find(cls2 + '-button-close').tclass('hidden', value !== true);
				break;
		}
	};

	self.esc = function(bind) {
		if (bind) {
			if (!self.$esc) {
				self.$esc = true;
				$(W).on('keydown', self.esc_keydown);
			}
		} else {
			if (self.$esc) {
				self.$esc = false;
				$(W).off('keydown', self.esc_keydown);
			}
		}
	};

	self.esc_keydown = function(e) {
		if (e.which === 27 && !e.isPropagationStopped()) {
			var val = self.get();
			if (!val || config.if === val) {
				e.preventDefault();
				e.stopPropagation();
				self.hide();
			}
		}
	};

	self.hideforce = function() {
		if (!self.hclass('hidden')) {
			self.aclass('hidden');
			self.release(true);
			self.find(cls2).rclass(cls + '-animate');
			W.$$form_level--;
		}
	};

	var allowscrollbars = function() {
		$('html').tclass(cls + '-noscroll', !!$(cls2 + '-container').not('.hidden').length);
	};

	self.setter = function(value) {

		setTimeout2(self.name + '-noscroll', allowscrollbars, 50);

		var isHidden = value !== config.if;

		if (self.hclass('hidden') === isHidden) {
			if (!isHidden) {
				config.reload && self.EXEC(config.reload, self);
				config.default && DEFAULT(self.makepath(config.default), true);
			}
			return;
		}

		setTimeout2(cls, function() {
			EMIT('reflow', self.name);
		}, 10);

		if (isHidden) {
			if (!config.independent)
				self.hideforce();
			return;
		}

		if (self.template) {
			var is = self.template.COMPILABLE();
			self.find(cls2).append(self.template);
			self.template = null;
			is && COMPILE();
		}

		if (W.$$form_level < 1)
			W.$$form_level = 1;

		W.$$form_level++;

		self.css('z-index', W.$$form_level * config.zindex);
		self.element.scrollTop(0);
		self.rclass('hidden');

		self.resize();
		self.release(false);

		config.reload && self.EXEC(config.reload, self);
		config.default && DEFAULT(self.makepath(config.default), true);

		if (!isMOBILE && config.autofocus) {
			setTimeout(function() {
				self.find(typeof(config.autofocus) === 'string' ? config.autofocus : 'input[type="text"],select,textarea').eq(0).focus();
			}, 1000);
		}

		setTimeout(function() {
			self.rclass('invisible');
			self.element.scrollTop(0);
			self.find(cls2).aclass(cls + '-animate');
		}, 300);

		// Fixes a problem with freezing of scrolling in Chrome
		setTimeout2(self.ID, function() {
			self.css('z-index', (W.$$form_level * config.zindex) + 1);
		}, 500);

		config.closeesc && self.esc(true);
	};
});

COMPONENT('floatinginput', 'minwidth:200', function(self, config, cls) {

	var cls2 = '.' + cls;
	var timeout, icon, plus, input, summary;
	var is = false;
	var plusvisible = false;

	self.readonly();
	self.singleton();
	self.nocompile && self.nocompile();

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'placeholder':
				self.find('input').prop('placeholder', value);
				break;
		}
	};

	self.make = function() {

		self.aclass(cls + ' hidden');
		self.append('<div class="{1}-summary hidden"></div><div class="{1}-input"><span class="{1}-add hidden"><i class="fa fa-plus"></i></span><span class="{1}-button"><i class="fa fa-search"></i></span><div><input type="text" placeholder="{0}" class="{1}-search-input" name="dir{2}" autocomplete="dir{2}" /></div></div'.format(config.placeholder, cls, Date.now()));

		input = self.find('input');
		icon = self.find(cls2 + '-button').find('i');
		plus = self.find(cls2 + '-add');
		summary = self.find(cls2 + '-summary');

		self.event('click', cls2 + '-button', function(e) {
			input.val('');
			self.search();
			e.stopPropagation();
			e.preventDefault();
		});

		self.event('click', cls2 + '-add', function() {
			if (self.opt.callback) {
				self.opt.scope && M.scope(self.opt.scope);
				self.opt.callback(input.val(), self.opt.element, true);
				self.hide();
			}
		});

		self.event('keydown', 'input', function(e) {
			switch (e.which) {
				case 27:
					self.hide();
					break;
				case 13:
					if (self.opt.callback) {
						self.opt.scope && M.scope(self.opt.scope);
						self.opt.callback(this.value, self.opt.element);
					}
					self.hide();
					break;
			}
		});

		var e_click = function(e) {
			var node = e.target;
			var count = 0;

			if (is) {
				while (true) {
					var c = node.getAttribute('class') || '';
					if (c.indexOf(cls + '-input') !== -1)
						return;
					node = node.parentNode;
					if (!node || !node.tagName || node.tagName === 'BODY' || count > 3)
						break;
					count++;
				}
			} else {
				is = true;
				while (true) {
					var c = node.getAttribute('class') || '';
					if (c.indexOf(cls) !== -1) {
						is = false;
						break;
					}
					node = node.parentNode;
					if (!node || !node.tagName || node.tagName === 'BODY' || count > 4)
						break;
					count++;
				}
			}

			is && self.hide(0);
		};

		var e_resize = function() {
			is && self.hide(0);
		};

		self.bindedevents = false;

		self.bindevents = function() {
			if (!self.bindedevents) {
				$(document).on('click', e_click);
				$(W).on('resize', e_resize);
				self.bindedevents = true;
			}
		};

		self.unbindevents = function() {
			if (self.bindedevents) {
				self.bindedevents = false;
				$(document).off('click', e_click);
				$(W).off('resize', e_resize);
			}
		};

		self.event('input', 'input', function() {
			var is = !!this.value;
			if (plusvisible !== is) {
				plusvisible = is;
				plus.tclass('hidden', !this.value);
			}
		});

		var fn = function() {
			is && self.hide(1);
		};

		self.on('reflow + scroll + resize + resize2', fn);
	};

	self.show = function(opt) {

		// opt.element
		// opt.callback(value, el)
		// opt.offsetX     --> offsetX
		// opt.offsetY     --> offsetY
		// opt.offsetWidth --> plusWidth
		// opt.placeholder
		// opt.render
		// opt.minwidth
		// opt.maxwidth
		// opt.icon;
		// opt.maxlength = 30;

		var el = opt.element instanceof jQuery ? opt.element[0] : opt.element;

		self.tclass(cls + '-default', !opt.render);

		if (!opt.minwidth)
			opt.minwidth = 200;

		if (is) {
			clearTimeout(timeout);
			if (self.target === el) {
				self.hide(1);
				return;
			}
		}

		self.initializing = true;
		self.target = el;
		plusvisible = false;

		var element = $(opt.element);

		setTimeout(self.bindevents, 500);

		self.opt = opt;
		opt.class && self.aclass(opt.class);

		input.val(opt.value || '');
		input.prop('maxlength', opt.maxlength || 50);

		self.target = element[0];

		var w = element.width();
		var offset = element.offset();
		var width = w + (opt.offsetWidth || 0);

		if (opt.minwidth && width < opt.minwidth)
			width = opt.minwidth;
		else if (opt.maxwidth && width > opt.maxwidth)
			width = opt.maxwidth;

		var ico = '';

		if (opt.icon) {
			if (opt.icon.indexOf(' ') === -1)
				ico = 'fa fa-' + opt.icon;
			else
				ico = opt.icon;
		} else
			ico = 'fa fa-pencil-alt';

		icon.rclass2('fa').aclass(ico).rclass('hidden');

		if (opt.value) {
			plusvisible = true;
			plus.rclass('hidden');
		} else
			plus.aclass('hidden');

		self.find('input').prop('placeholder', opt.placeholder || config.placeholder);
		var options = { left: 0, top: 0, width: width };

		summary.tclass('hidden', !opt.summary).html(opt.summary || '');

		switch (opt.align) {
			case 'center':
				options.left = Math.ceil((offset.left - width / 2) + (width / 2));
				break;
			case 'right':
				options.left = (offset.left - width) + w;
				break;
			default:
				options.left = offset.left;
				break;
		}

		options.top = opt.position === 'bottom' ? ((offset.top - self.height()) + element.height()) : offset.top;
		options.scope = M.scope ? M.scope() : '';

		if (opt.offsetX)
			options.left += opt.offsetX;

		if (opt.offsetY)
			options.top += opt.offsetY;

		self.css(options);

		!isMOBILE && setTimeout(function() {
			opt.select && input[0].select();
			input.focus();
		}, 200);


		self.tclass(cls + '-monospace', !!opt.monospace);
		self.rclass('hidden');

		setTimeout(function() {
			self.initializing = false;
			is = true;
			if (self.opt && self.target && self.target.offsetParent)
				self.aclass(cls + '-visible');
			else
				self.hide(1);
		}, 100);
	};

	self.hide = function(sleep) {
		if (!is || self.initializing)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.unbindevents();
			self.rclass(cls + '-visible').aclass('hidden');
			if (self.opt) {
				self.opt.close && self.opt.close();
				self.opt.class && self.rclass(self.opt.class);
				self.opt = null;
			}
			is = false;
		}, sleep ? sleep : 100);
	};
});

COMPONENT('pin', 'blank:●;count:6;hide:false;mask:true;allowpaste:true', function(self, config, cls) {

	var reg_validation = /[0-9]/;
	var inputs = null;
	var skip = false;
	var count = 0;

	self.nocompile && self.nocompile();

	self.validate = function(value, init) {
		return init ? true : config.required || config.disabled ? !!(value && value.indexOf(' ') === -1) : true;
	};

	self.configure = function(key, value, init) {
		switch (key) {
			case 'count':
				!init && self.redraw();
				break;
			case 'disabled':
				self.find('input').prop('disabled', value);
				self.tclass('ui-disabled', value);
				!init && !value && self.state(1, 1);
				break;
		}
	};

	self.redraw = function() {
		var builder = [];
		count = config.count;
		for (var i = 0; i < count; i++)
			builder.push('<div data-index="{0}" class="ui-pin-input"><input type="{1}" maxlength="1" autocomplete="pin{2}" name="pin{2}" pattern="[0-9]" /></div>'.format(i, isMOBILE ? 'tel' : 'text', Date.now() + i));
		self.html(builder.join(''));
	};

	self.make = function() {

		self.aclass(cls);
		self.redraw();

		self.event('keypress', 'input', function(e) {
			var c = e.which;
			var t = this;
			if (c >= 48 && c <= 57) {
				var c = String.fromCharCode(e.charCode);
				if (t.value !== c)
					t.value = c;

				if (config.mask) {
					if (config.hide) {
						self.maskforce(t);
					} else
						self.mask();
				}
				else {
					t.setAttribute('data-value', t.value);
					self.getter();
				}

				setTimeout(function(el) {
					var next = el.parent().next().find('input');
					next.length && next.focus();
				}, 50, $(t));
			} else if (c > 30)
				e.preventDefault();
		});

		self.event('keydown', 'input', function(e) {
			if (e.which === 8) {

				var el = $(this);
				if (!el.val()) {
					var prev = el.parent().prev().find('input');
					prev.val('').focus();
					prev.attrd('value', '');
					config.mask && self.mask();
				}

				el.attrd('value', '');
				self.getter();
			}
		});

		self.event('paste', 'input', function(e) {

			e.preventDefault();
			if (!config.allowpaste)
				return;

			var text = e.originalEvent.clipboardData.getData('text');
			var paste = text.replace(/\s+/g,'');
			if (!paste.parseInt() || config.count !== paste.length)
				return;

			var lastinput = inputs.length - 1;
			inputs[lastinput].focus();
			self.set(paste, 2);
			self.change(true);
			config.exec && self.SEEX(config.exec, paste);
		});

		inputs = self.find('input');
	};

	self.maskforce2 = function() {
		self.maskforce(this);
	};

	self.maskforce = function(input) {
		if (input.value && reg_validation.test(input.value)) {
			input.setAttribute('data-value', input.value);
			input.value = config.blank;
			self.getter();
		}
	};

	self.mask = function() {
		setTimeout2(self.id + '.mask', function() {
			inputs.each(self.maskforce2);
		}, 300);
	};

	self.focus = function() {
		var el = self.find('input').eq(0);
		if (el.length)
			el.focus();
		else
			setTimeout(self.focus, 500);
	};

	self.getter = function() {
		setTimeout2(self.id + '.getter', function() {
			var value = '';

			for (var i = 0; i < inputs.length; i++)
				value += inputs[i].getAttribute('data-value') || ' ';

			if (self.get() !== value) {
				self.change(true);
				skip = true;
				var val = value.trim();
				self.set(val);
				if (config.exec && val.indexOf(' ') === -1 && val.length === config.count)
					self.SEEX(config.exec, val);
			}

		}, 100);
	};

	self.setter = function(value) {

		if (skip) {
			skip = false;
			return;
		}

		if (value == null)
			value = '';

		inputs.each(function(index) {
			var number = value.substring(index, index + 1);
			this.setAttribute('data-value', number);
			this.value = value ? config.mask ? config.blank  : number : '';
		});
	};

	self.state = function(type) {
		if (type) {
			var invalid = config.required ? self.isInvalid() : false;
			if (invalid !== self.$oldstate) {
				self.$oldstate = invalid;
				self.tclass(cls + '-invalid', invalid);
			}
		}
	};
});

COMPONENT('enter', 'validate:1;trigger:button[name="submit"];timeout:1500', function(self, config) {
	self.readonly();
	self.make = function() {
		self.event('keydown', 'input', function(e) {
			if (e.which === 13 && (!config.validate || CAN(self.path))) {
				if (config.exec) {
					if (!BLOCKED(self.ID, config.timeout))
						EXEC(self.makepath(config.exec), self);
				} else {
					var btn = self.find(config.trigger);
					if (!btn.prop('disabled')) {
						if (!BLOCKED(self.ID, config.timeout))
							btn.trigger('click');
					}
				}
			}
		});
	};
});

COMPONENT('animation', 'style:2;delay:200;init:1000;cleaner:1000;visible:0;offset:50', function(self, config, cls) {

	self.readonly();

	if (!config.if)
		self.blind();

	self.destroy = function() {
		self.visibleinterval && clearInterval(self.interval);
	};

	self.make = function() {
		if (config.visible) {
			self.visibleinterval = setInterval(function() {
				if (VISIBLE(self.dom, config.offset)) {
					self.visibleinterval = null;
					clearInterval(self.visibleinterval);
					self.animate();
				}
			}, 500);
		} else
			setTimeout2(self.ID, self.animate, config.init);

		config.datasource && self.datasource(config.datasource, function() {
			setTimeout2(self.ID, self.animate, config.init);
		});
	};

	self.restore = function() {
		self.find('.animated').aclass('animation').rclass('animated');
	};

	self.animate = function() {

		var el = self.find('.animation');
		var arr = [];

		for (var i = 0; i < el.length; i++) {

			var t = el[i];

			if (!t.$anim) {
				var $t = $(t);

				if (!t.$animopt) {
					var opt = ($t.attrd('animation') || '').parseConfig();
					t.$animopt = opt;
				}

				t.$anim = cls + '-' + (t.$animopt.style || config.style);
				$t.aclass(t.$anim + '-init animating');
				arr.push($t);
			}
		}

		if (!arr.length)
			return;

		setTimeout(function(arr) {

			if (self.removed)
				return;

			var maxdelay = 500;

			if (config.together) {

				for (var i = 0; i < arr.length; i++) {
					var el = arr[i];
					var c = el[0].$anim;
					var opt = el[0].$animopt;
					if (!self.removed) {
						if (opt.noanimation)
							el.rclass('animation ' + c + '-init');
						else
							el.rclass('animation').aclass(c + '-run');
					}
				}

				setTimeout(function() {
					if (!self.removed) {
						for (var i = 0; i < arr.length; i++) {
							var c = arr[i][0].$anim;
							arr[i].rclass(c + '-init ' + c + '-run animating').aclass('animated');
							delete arr[i][0].$anim;
						}
						config.exec && self.EXEC(config.exec, self.element);
					}
				}, 1500);

				return;
			}

			arr.wait(function(el, next, index) {

				var opt = el[0].$animopt;
				var delay = (opt.order || index) * (opt.delay || config.delay);
				var clsname = cls + '-' + (opt.style || config.style);

				if (maxdelay < delay)
					maxdelay = delay;

				if (el.hclass('hidden') || el.hclass('invisible')) {
					el.rclass('animation ' + clsname + '-init').aclass('animated');
					next();
					return;
				}

				el[0].$animtime = setTimeout(function(el) {
					if (!self.removed) {
						if (opt.noanimation)
							el.rclass('animation ' + clsname + '-init');
						else
							el.rclass('animation').aclass(clsname + '-run');
					}
				}, delay, el);

				next();

			}, function() {

				setTimeout(function() {
					for (var i = 0; i < arr.length; i++) {
						var c = arr[i][0].$anim;
						arr[i].rclass(c + '-init ' + c + '-run animating').aclass('animated');
						delete arr[i][0].$anim;
					}
					config.exec && self.EXEC(config.exec, self.element);
				}, maxdelay + 1000);
			});

		}, config.init / 10 >> 0, arr);
	};

	self.setter = function(value) {
		if (config.if) {
			if (value === config.if)
				setTimeout2(self.ID, self.animate, config.init);
			else
				self.restore();
		}
	};

});

COMPONENT('approve', 'cancel:Cancel', function(self, config, cls) {

	var cls2 = '.' + cls;
	var events = {};
	var buttons;
	var oldcancel;

	self.readonly();
	self.singleton();
	self.nocompile && self.nocompile();

	self.make = function() {

		self.aclass(cls + ' hidden');
		self.html('<div><div class="{0}-body"><span class="{0}-close"><i class="fa fa-times"></i></span><div class="{0}-content"></div><div class="{0}-buttons"><button data-index="0"></button><button data-index="1"></button></div></div></div>'.format(cls));

		buttons = self.find(cls2 + '-buttons').find('button');

		self.event('click', 'button', function() {
			self.hide(+$(this).attrd('index'));
		});

		self.event('click', cls2 + '-close', function() {
			self.callback = null;
			self.hide(-1);
		});

		self.event('click', function(e) {
			var t = e.target.tagName;
			if (t !== 'DIV')
				return;
			var el = self.find(cls2 + '-body');
			el.aclass(cls + '-click');
			setTimeout(function() {
				el.rclass(cls + '-click');
			}, 300);
		});
	};

	events.keydown = function(e) {
		var index = e.which === 13 ? 0 : e.which === 27 ? 1 : null;
		if (index != null) {
			self.find('button[data-index="{0}"]'.format(index)).trigger('click');
			e.preventDefault();
			e.stopPropagation();
			events.unbind();
		}
	};

	events.bind = function() {
		$(W).on('keydown', events.keydown);
	};

	events.unbind = function() {
		$(W).off('keydown', events.keydown);
	};

	self.show = function(message, a, b, fn) {

		if (typeof(b) === 'function') {
			fn = b;
			b = config.cancel;
		}

		if (M.scope)
			self.currscope = M.scope();

		self.callback = fn;

		var icon = a.match(/"[a-z0-9-\s]+"/);
		if (icon) {

			var tmp = icon + '';
			if (tmp.indexOf(' ') == -1)
				tmp = 'fa fa-' + tmp;

			a = a.replace(icon, '').trim();
			icon = '<i class="{0}"></i>'.format(tmp.replace(/"/g, ''));
		} else
			icon = '';

		var color = a.match(/#[0-9a-f]+/i);
		if (color)
			a = a.replace(color, '').trim();

		buttons.eq(0).css('background-color', color || '').html(icon + a);

		if (oldcancel !== b) {
			oldcancel = b;
			buttons.eq(1).html(b);
		}

		self.find(cls2 + '-content').html(message.replace(/\n/g, '<br />'));
		$('html').aclass(cls + '-noscroll');
		self.rclass('hidden');
		events.bind();
		self.aclass(cls + '-visible', 5);
	};

	self.hide = function(index) {

		if (!index) {
			self.currscope && M.scope(self.currscope);
			self.callback && self.callback(index);
		}

		self.rclass(cls + '-visible');
		events.unbind();
		setTimeout2(self.id, function() {
			$('html').rclass(cls + '-noscroll');
			self.aclass('hidden');
		}, 1000);
	};
});

COMPONENT('wysiwyg', function(self, config, cls) {

	var cls2 = '.' + cls;
	var timers = {};
	var buttons = {};
	var D = document;
	var skip = false;
	var placeholder;
	var editor;

	function selectall(el) {
		var doc = W.document, sel, range;
		if (W.getSelection && doc.createRange) {
			sel = W.getSelection();
			range = doc.createRange();
			range.selectNodeContents(el);
			sel.removeAllRanges();
			sel.addRange(range);
		} else if (doc.body.createTextRange) {
			range = doc.body.createTextRange();
			range.moveToElementText(el);
			range.select();
		}
	}

	var findparent = function(node) {
		while (node) {
			if (node === editor[0])
				return;
			if (node.parentNode === editor[0])
				return node;
			node = node.parentNode;
		}
	};

	var check = function(node, tag) {
		while (node) {
			if (node === editor[0])
				return;
			if (node.tagName === tag)
				return node;
			node = node.parentNode;
		}
	};

	var clean = function(node) {
		var tag = D.createTextNode($(node).text());
		editor[0].replaceChild(tag, node);
		selectall(tag);
	};

	self.validate = function(value) {
		var type = typeof(value);

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);
		return value.length > 0;
	};

	self.make = function() {

		self.aclass(cls);
		self.attr('wysiwyg', 'true');
		self.append('<div class="{0}-toolbar"><button name="bold"><i class="fa fa-bold"></i></button><button name="italic"><i class="fa fa-italic"></i></button><button name="underline"><i class="fa fa-underline"></i></button></button><button name="link"><i class="fa fa-link"></i></button><button name="code"><i class="fa fa-highlighter"></i></button></div><div class="{0}-placeholder">{1}</div><div class="{0}-body" contenteditable="true"></div>'.format(cls, config.placeholder));
		editor = self.find(cls2 + '-body');
		placeholder = self.find(cls2 + '-placeholder');

		placeholder.on('click', function() {
			placeholder.aclass('hidden');
			editor.focus();
		});

		self.find('button').on('click', function() {
			switch (this.name) {
				case 'bold':
					D.execCommand('Bold', false, null);
					break;
				case 'italic':
					D.execCommand('Italic', false, null);
					break;
				case 'underline':
					D.execCommand('Underline', false, null);
					break;
				case 'mark':
					var node = self.getNode();
					var tag = check(node, 'SPAN');
					if (tag) {
						clean(tag);
					} else {
						var selection = self.getSelection();
						selection && D.execCommand('insertHtml', false, '<span class="marked">{0}</span>'.format(node === editor[0] ? selection : node.innerHTML));
					}
					break;
				case 'code':
					var node = self.getNode();
					var tag = check(node, 'CODE');
					if (tag) {
						clean(tag);
					} else {
						var selection = self.getSelection();
						selection && D.execCommand('insertHtml', false, '<code>{0}</code>'.format(node === editor[0] ? selection : node.innerHTML));
					}
					break;
				case 'clean':
					var selection = self.getSelection();
					if (selection) {
						node = self.getSelection(true);
					} else {
						node = findparent(self.getNode());
						node && clean(node);
					}

					break;
				case 'link':

					var node = self.getNode();
					var tag = check(node, 'A');
					if (tag) {
						clean(tag);
					} else {
						var id = '#URL' + Date.now();
						var html = self.getSelection();
						if (html) {
							D.execCommand('CreateLink', false, id);
							var a = self.find('a[href="{0}"]'.format(id)).attr('target', '_blank').attr('href', html);
							self.event('link', a);
						}
					}
					break;
			}
		}).each(function() {
			buttons[this.name] = this;
		});

		var el = self.element;

		el.on('selectstart', function() {
			clearTimeout(timers.selection);
			timers.selection = setTimeout(function() {
				self.event('select', self.getSelection());
			}, 500);
		});

		editor.on('focus', function() {
			clearTimeout(timers.focused);
			clearInterval(timers.changes);
			timers.changes = null;
			self.focused = true;
			self.event('focus', self);
			placeholder.aclass('hidden');
		});

		self.save = function() {
			skip = true;
			self.getter(editor.html());
		};

		editor.on('click', function(e) {
			e.target && self.event('click', e.target);
		});

		editor.on('blur', function() {
			var t = editor.text().trim();
			placeholder.tclass('hidden', !!t);
			clearTimeout(timers.focused);
			clearInterval(timers.changes);
			timers.changes = null;
			self.save();
			timers.focused = setTimeout(function() {
				self.event('blur', self);
			}, 200);
		});

		editor.on('paste', function(e) {
			e.preventDefault();
			e.stopPropagation();
			var text = e.originalEvent.clipboardData.getData(self.attrd('clipboard') || 'text/plain');
			self.event('paste', text);
		});

		editor.on('keydown', function(e) {

			if (!timers.changes)
				timers.changes = setInterval(self.save, 1000);

			if (!e.metaKey && !e.ctrlKey)
				return;

			if (e.which === 66) {
				// bold
				D.execCommand('Bold', false, null);
				e.preventDefault();
				e.stopPropagation();
				return;
			}

			if (e.which === 76) {
				// link
				e.preventDefault();
				e.stopPropagation();

				var html = self.getSelection();
				if (html) {
					var id = '#URL' + Date.now();
					D.execCommand('CreateLink', false, id);
					var a = self.find('a[href="{0}"]'.format(id)).attr('target', '_blank').attr('href', html);
					self.event('link', a);
				}
				return;
			}

			if (e.which === 73) {
				// italic
				D.execCommand('Italic', false, null);
				e.preventDefault();
				e.stopPropagation();
				return;
			}

			if (e.which === 85) {
				// underline
				D.execCommand('Underline', false, null);
				e.preventDefault();
				e.stopPropagation();
				return;
			}
		});

		var notify = function(e) {
			timers.notify = null;
			self.event('cursor', e.target);
		};

		el.on('keydown', function(e) {
			timers.notify && clearTimeout(timers.notify);
			timers.notify = setTimeout(notify, 100, e);
		});
	};

	self.exec = function() {
		D.execCommand.apply(D, arguments);
		return self;
	};

	self.insert = function(value, encoded) {
		D.execCommand(encoded ? 'insertText' : 'insertHtml', false, value);
		return self;
	};

	var loadformat = function() {

		var node = self.getNode();
		var toolbar = {};

		while (node) {

			if (node === editor[0])
				return toolbar;

			switch (node.tagName) {
				case 'B':
					toolbar.bold = 1;
					break;
				case 'I':
					toolbar.italic = 1;
					break;
				case 'A':
					toolbar.link = 1;
					break;
				case 'SPAN':
					toolbar.mark = 1;
					break;
				case 'CODE':
					toolbar.code = 1;
					break;
				case 'S':
					toolbar.strike = 1;
					break;
				case 'U':
					toolbar.underline = 1;
					break;
			}

			node = node.parentNode;
		}

		return toolbar;
	};

	self.event = function(type, value) {

		// type = bold          - when a text is bolded (value is boolean)
		// type = italic        - when a text is italic (value is boolean)
		// type = underline     - when a text is underlined (value is boolean)
		// type = link          - when a link is created (value is a temporary URL)
		// type = current       - when a current element is changed in the text (value is NODE)
		// type = paste         - when the clipboard is used (value is a clipboard value)
		// type = select        - when a text is selected (value is selected text)
		// type = focus         - editor is focused (value is undefined)
		// type = blur          - editor is not focused (value is undefined)
		// type = click         - click on the specific element in the text (value is NODE)

		if (type === 'click' || type === 'cursor') {

			var format = loadformat(self.getNode());
			var keys = Object.keys(buttons);

			for (var i = 0; i < keys.length; i++) {
				var key = keys[i];
				var btn = buttons[key];
				var is = format[key] === 1;
				if (btn.prevstate !== is) {
					if (is)
						btn.classList.add('selected');
					else
						btn.classList.remove('selected');
					btn.prevstate = is;
				}
			}
		}

		if (type === 'paste')
			self.insert(value, true);
	};

	self.getNode = function() {
		var node = D.getSelection().anchorNode;
		if (node)
			return (node.nodeType === 3 ? node.parentNode : node);
	};

	self.getSelection = function(node) {
		if (D.selection && D.selection.type === 'Text')
			return D.selection.createRange().htmlText;
		else if (!W.getSelection)
			return;
		var sel = W.getSelection();
		if (!sel.rangeCount)
			return '';
		var container = D.createElement('div');
		for (var i = 0, len = sel.rangeCount; i < len; ++i)
			container.appendChild(sel.getRangeAt(i).cloneContents());
		return node ? container : container.innerHTML;
	};

	self.focus = function() {
		editor.focus();
	};

	self.setter = function(value, path, type) {

		if (skip && type === 2) {
			skip = false;
			return;
		}

		var val = value ? (value + '').trim() : '';
		self.reset();
		editor.html(val);
		placeholder.tclass('hidden', !!val);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid !== self.$oldstate) {
			self.$oldstate = invalid;
			self.tclass(cls + '-invalid', invalid);
		}
	};
});

COMPONENT('directory', 'minwidth:200', function(self, config, cls) {

	var cls2 = '.' + cls;
	var container, timeout, icon, plus, skipreset = false, skipclear = false, ready = false, input = null, issearch = false;
	var is = false, selectedindex = 0, resultscount = 0, skiphide = false;
	var templateE = '{{ name | encode | ui_directory_helper }}';
	var templateR = '{{ name | raw }}';
	var template = '<li data-index="{{ $.index }}" data-search="{{ $.search }}" {{ if selected }} class="current selected{{ if classname }} {{ classname }}{{ fi }}"{{ else if classname }} class="{{ classname }}"{{ fi }}>{{ if $.checkbox }}<span class="' + cls + '-checkbox"><i class="fa fa-check"></i></span>{{ fi }}{0}</li>';
	var templateraw = template.format(templateR);
	var regstrip = /(&nbsp;|<([^>]+)>)/ig;
	var parentclass;

	template = template.format(templateE);

	Thelpers.ui_directory_helper = function(val) {
		var t = this;
		return t.template ? (typeof(t.template) === 'string' ? t.template.indexOf('{{') === -1 ? t.template : Tangular.render(t.template, this) : t.render(this, val)) : self.opt.render ? self.opt.render(this, val) : val;
	};

	self.template = Tangular.compile(template);
	self.templateraw = Tangular.compile(templateraw);

	self.readonly();
	self.singleton();
	self.nocompile && self.nocompile();

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'placeholder':
				self.find('input').prop('placeholder', value);
				break;
		}
	};

	self.make = function() {

		self.aclass(cls + ' hidden');
		self.append('<div class="{1}-search"><span class="{1}-add hidden"><i class="fa fa-plus"></i></span><span class="{1}-button"><i class="fa fa-search"></i></span><div><input type="text" placeholder="{0}" class="{1}-search-input" name="dir{2}" autocomplete="new-password" /></div></div><div class="{1}-container"><ul></ul></div>'.format(config.placeholder, cls, Date.now()));
		container = self.find('ul');
		input = self.find('input');
		icon = self.find(cls2 + '-button').find('.fa');
		plus = self.find(cls2 + '-add');

		self.event('mouseenter mouseleave', 'li', function() {
			if (ready && !issearch) {
				container.find('li.current').rclass('current');
				$(this).aclass('current');
				var arr = container.find('li:visible');
				for (var i = 0; i < arr.length; i++) {
					if ($(arr[i]).hclass('current')) {
						selectedindex = i;
						break;
					}
				}
			}
		});

		self.event('focus', 'input', function() {
			if (self.opt.search === false)
				$(this).blur();
		});

		self.event('click', cls2 + '-button', function(e) {
			skipclear = false;
			input.val('');
			self.search();
			e.stopPropagation();
			e.preventDefault();
		});

		self.event('click', cls2 + '-add', function() {
			if (self.opt.custom && self.opt.callback) {
				self.opt.scope && M.scope(self.opt.scope);
				self.opt.callback(input.val(), self.opt.element, true);
				self.hide();
			}
		});

		self.event('click', 'li', function(e) {

			if (self.opt.callback) {
				self.opt.scope && M.scope(self.opt.scope);
				var item = self.opt.items[+this.getAttribute('data-index')];
				if (self.opt.checkbox) {
					item.selected = !item.selected;
					$(this).tclass('selected', item.selected);
					var response = [];
					for (var i = 0; i < self.opt.items.length; i++) {
						var m = self.opt.items[i];
						if (m.selected)
							response.push(m);
					}
					self.opt.callback(response, self.opt.element);
					skiphide = true;
				} else
					self.opt.callback(item, self.opt.element);
			}

			is = true;

			if (!self.opt.checkbox) {
				self.hide(0);
				e.preventDefault();
				e.stopPropagation();
			}

		});

		var e_click = function(e) {

			if (skiphide) {
				skiphide = false;
				return;
			}

			var node = e.target;
			var count = 0;

			if (is) {
				while (true) {
					var c = node.getAttribute('class') || '';
					if (c.indexOf(cls + '-search-input') !== -1)
						return;
					node = node.parentNode;
					if (!node || !node.tagName || node.tagName === 'BODY' || count > 3)
						break;
					count++;
				}
			} else {
				is = true;
				while (true) {
					var c = node.getAttribute('class') || '';
					if (c.indexOf(cls) !== -1) {
						is = false;
						break;
					}
					node = node.parentNode;
					if (!node || !node.tagName || node.tagName === 'BODY' || count > 4)
						break;
					count++;
				}
			}

			is && self.hide(0);
		};

		var e_resize = function() {
			is && self.hide(0);
		};

		self.bindedevents = false;

		self.bindevents = function() {
			if (!self.bindedevents) {
				$(document).on('click', e_click);
				$(W).on('resize', e_resize);
				self.bindedevents = true;
			}
		};

		self.unbindevents = function() {
			if (self.bindedevents) {
				self.bindedevents = false;
				$(document).off('click', e_click);
				$(W).off('resize', e_resize);
			}
		};

		self.event('keydown', 'input', function(e) {
			var o = false;
			switch (e.which) {
				case 8:
					skipclear = false;
					break;
				case 27:
					o = true;
					self.hide();
					break;
				case 13:
					o = true;
					var sel = self.find('li.current');
					if (self.opt.callback) {
						self.opt.scope && M.scope(self.opt.scope);
						if (sel.length)
							self.opt.callback(self.opt.items[+sel.attrd('index')], self.opt.element);
						else if (self.opt.custom)
							self.opt.callback(this.value, self.opt.element, true);
					}
					self.hide();
					break;
				case 38: // up
					o = true;
					selectedindex--;
					if (selectedindex < 0)
						selectedindex = 0;
					self.move();
					break;
				case 40: // down
					o = true;
					selectedindex++;
					if (selectedindex >= resultscount)
						selectedindex = resultscount;
					self.move();
					break;
			}

			if (o) {
				e.preventDefault();
				e.stopPropagation();
			}

		});

		self.event('input', 'input', function() {
			issearch = true;
			setTimeout2(self.ID, self.search, 100, null, this.value);
		});

		var fn = function() {
			is && self.hide(1);
		};

		self.on('reflow + scroll + resize + resize2', fn);
		$(W).on('scroll', fn);
	};

	self.move = function() {

		var counter = 0;
		var scroller = container.parent();
		var li = container.find('li');
		var hli = (li.eq(0).innerHeight() || 30) + 1;
		var was = false;
		var last = -1;
		var lastselected = 0;
		var plus = (hli * 2);

		for (var i = 0; i < li.length; i++) {

			var el = $(li[i]);

			if (el.hclass('hidden')) {
				el.rclass('current');
				continue;
			}

			var is = selectedindex === counter;
			el.tclass('current', is);

			if (is) {
				was = true;
				var t = (hli * (counter || 1));
				// var p = (t / sh) * 100;
				scroller[0].scrollTop = t - plus;
			}

			counter++;
			last = i;
			lastselected++;
		}

		if (!was && last >= 0) {
			selectedindex = lastselected;
			li.eq(last).aclass('current');
		}
	};

	var nosearch = function() {
		issearch = false;
	};

	self.nosearch = function() {
		setTimeout2(self.ID + 'nosearch', nosearch, 500);
	};

	self.search = function(value) {

		if (!self.opt)
			return;

		icon.tclass('fa-times', !!value).tclass('fa-search', !value);
		self.opt.custom && plus.tclass('hidden', !value);

		if (!value && !self.opt.ajax) {
			if (!skipclear)
				container.find('li').rclass('hidden');
			if (!skipreset)
				selectedindex = 0;
			resultscount = self.opt.items ? self.opt.items.length : 0;
			self.move();
			self.nosearch();
			return;
		}

		resultscount = 0;
		selectedindex = 0;

		if (self.opt.ajax) {
			var val = value || '';
			if (self.ajaxold !== val) {
				self.ajaxold = val;
				setTimeout2(self.ID, function(val) {
					self.opt && self.opt.ajax(val, function(items) {
						var builder = [];
						var indexer = {};
						var item;
						var key = (self.opt.search == true ? self.opt.key : (self.opt.search || self.opt.key)) || 'name';

						for (var i = 0; i < items.length; i++) {
							item = items[i];
							if (self.opt.exclude && self.opt.exclude(item))
								continue;
							indexer.index = i;
							indexer.search = item[key] ? item[key].replace(regstrip, '') : '';
							indexer.checkbox = self.opt.checkbox === true;
							resultscount++;
							builder.push(self.opt.ta(item, indexer));
						}

						if (self.opt.empty) {
							item = {};
							var tmp = self.opt.raw ? '<b>{0}</b>'.format(self.opt.empty) : self.opt.empty;
							item[self.opt.key || 'name'] = tmp;
							if (!self.opt.raw)
								item.template = '<b>{0}</b>'.format(self.opt.empty);
							indexer.index = -1;
							builder.unshift(self.opt.ta(item, indexer));
						}

						skipclear = true;
						self.opt.items = items;
						container.html(builder);
						self.move();
						self.nosearch();
					});
				}, 300, null, val);
			}
		} else if (value) {
			value = value.toSearch();
			var arr = container.find('li');
			for (var i = 0; i < arr.length; i++) {
				var el = $(arr[i]);
				var val = el.attrd('search').toSearch();
				var is = val.indexOf(value) === -1;
				el.tclass('hidden', is);
				if (!is)
					resultscount++;
			}
			skipclear = true;
			self.move();
			self.nosearch();
		}
	};

	self.show = function(opt) {

		// opt.element
		// opt.items
		// opt.callback(value, el)
		// opt.offsetX     --> offsetX
		// opt.offsetY     --> offsetY
		// opt.offsetWidth --> plusWidth
		// opt.placeholder
		// opt.render
		// opt.custom
		// opt.minwidth
		// opt.maxwidth
		// opt.key
		// opt.exclude    --> function(item) must return Boolean
		// opt.search
		// opt.selected   --> only for String Array "opt.items"
		// opt.classname

		var el = opt.element instanceof jQuery ? opt.element[0] : opt.element;

		if (opt.items == null)
			opt.items = EMPTYARRAY;

		self.tclass(cls + '-default', !opt.render);

		if (parentclass) {
			self.rclass(parentclass);
			parentclass = null;
		}

		if (opt.classname) {
			self.aclass(opt.classname);
			parentclass = opt.classname;
		}

		if (!opt.minwidth)
			opt.minwidth = 200;

		if (is) {
			clearTimeout(timeout);
			if (self.target === el) {
				self.hide(1);
				return;
			}
		}

		self.initializing = true;
		self.target = el;
		opt.ajax = null;
		self.ajaxold = null;

		var element = $(opt.element);
		var callback = opt.callback;
		var items = opt.items;
		var type = typeof(items);
		var item;

		if (type === 'string') {
			items = GET(items);
			type = typeof(items);
		}

		if (type === 'function' && callback) {
			type = '';
			opt.ajax = items;
			items = null;
		}

		if (!items && !opt.ajax) {
			self.hide(0);
			return;
		}

		setTimeout(self.bindevents, 500);
		self.tclass(cls + '-search-hidden', opt.search === false);

		self.opt = opt;
		opt.class && self.aclass(opt.class);

		input.val('');

		var builder = [];
		var selected = null;

		opt.ta = opt.key ? Tangular.compile((opt.raw ? templateraw : template).replace(/\{\{\sname/g, '{{ ' + opt.key)) : opt.raw ? self.templateraw : self.template;

		if (!opt.ajax) {
			var indexer = {};
			var key = (opt.search == true ? opt.key : (opt.search || opt.key)) || 'name';
			for (var i = 0; i < items.length; i++) {

				item = items[i];

				if (typeof(item) === 'string')
					item = { name: item, id: item, selected: item === opt.selected };

				if (opt.exclude && opt.exclude(item))
					continue;

				if (item.selected || opt.selected === item) {
					selected = i;
					skipreset = true;
					item.selected = true;
				} else
					item.selected = false;

				indexer.checkbox = opt.checkbox === true;
				indexer.index = i;
				indexer.search = item[key] ? item[key].replace(regstrip, '') : '';
				builder.push(opt.ta(item, indexer));
			}

			if (opt.empty) {
				item = {};
				var tmp = opt.raw ? '<b>{0}</b>'.format(opt.empty) : opt.empty;
				item[opt.key || 'name'] = tmp;
				if (!opt.raw)
					item.template = '<b>{0}</b>'.format(opt.empty);
				indexer.index = -1;
				builder.unshift(opt.ta(item, indexer));
			}
		}

		self.target = element[0];

		var w = element.width();
		var offset = element.offset();
		var width = w + (opt.offsetWidth || 0);

		if (opt.minwidth && width < opt.minwidth)
			width = opt.minwidth;
		else if (opt.maxwidth && width > opt.maxwidth)
			width = opt.maxwidth;

		ready = false;

		opt.ajaxold = null;
		plus.aclass('hidden');
		self.find('input').prop('placeholder', opt.placeholder || config.placeholder);
		var scroller = self.find(cls2 + '-container').css('width', width + 30);
		container.html(builder);

		var options = { left: 0, top: 0, width: width };

		switch (opt.align) {
			case 'center':
				options.left = Math.ceil((offset.left - width / 2) + (opt.element.innerWidth() / 2));
				break;
			case 'right':
				options.left = (offset.left - width) + opt.element.innerWidth();
				break;
			default:
				options.left = offset.left;
				break;
		}

		options.top = opt.position === 'bottom' ? ((offset.top - self.height()) + element.height()) : offset.top;
		options.scope = M.scope ? M.scope() : '';

		if (opt.offsetX)
			options.left += opt.offsetX;

		if (opt.offsetY)
			options.top += opt.offsetY;

		var mw = width;
		var mh = self.height();

		if (options.left < 0)
			options.left = 10;
		else if ((mw + options.left) > WW)
			options.left = (WW - mw) - 10;

		if (options.top < 0)
			options.top = 10;
		else if ((mh + options.top) > WH)
			options.top = (WH - mh) - 10;

		self.css(options);

		!isMOBILE && setTimeout(function() {
			ready = true;
			if (opt.search !== false)
				input.focus();
		}, 200);

		setTimeout(function() {
			self.initializing = false;
			is = true;
			if (selected == null)
				scroller[0].scrollTop = 0;
			else {
				var h = container.find('li:first-child').innerHeight() + 1;
				var y = (container.find('li.selected').index() * h) - (h * 2);
				scroller[0].scrollTop = y < 0 ? 0 : y;
			}
		}, 100);

		if (is) {
			self.search();
			return;
		}

		selectedindex = selected || 0;
		resultscount = items ? items.length : 0;
		skipclear = true;

		self.search();
		self.rclass('hidden');

		setTimeout(function() {
			if (self.opt && self.target && self.target.offsetParent)
				self.aclass(cls + '-visible');
			else
				self.hide(1);
		}, 100);

		skipreset = false;
	};

	self.hide = function(sleep) {
		if (!is || self.initializing)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.unbindevents();
			self.rclass(cls + '-visible').aclass('hidden');
			if (self.opt) {
				self.opt.close && self.opt.close();
				self.opt.class && self.rclass(self.opt.class);
				self.opt = null;
			}
			is = false;
		}, sleep ? sleep : 100);
	};
});

COMPONENT('sounds', 'url:https://cdn.componentator.com/sounds/', function(self, config) {

	var volume = 0;
	var can = false;

	self.items = [];
	self.readonly();
	self.singleton();
	self.nocompile && self.nocompile();

	self.make = function() {
		var audio = document.createElement('audio');
		if (audio.canPlayType && audio.canPlayType('audio/mpeg').replace(/no/, ''))
			can = true;
	};

	self.setter = function(value) {
		volume = value || 0;
	};

	self.play = function(type) {
		self.playurl(config.url + type + '.mp3');
	};

	self.success = function() {
		self.play('success');
	};

	self.error = self.fail = function() {
		self.play('fail');
	};

	self.message = function() {
		self.play('message');
	};

	self.notify = self.notifications = function() {
		self.play('notifications');
	};

	self.badge = self.badges = function() {
		self.play('badges');
	};

	self.confirm = function() {
		self.play('confirm');
	};

	self.beep = function() {
		self.play('beep');
	};

	self.drum = function() {
		self.play('drum');
	};

	self.warning = function() {
		self.play('warning');
	};

	self.alert = function() {
		self.play('alert');
	};

	self.playurl = function(url) {

		if (!can || !volume)
			return;

		var audio = new W.Audio();

		audio.src = url;
		audio.volume = volume;
		audio.play();

		audio.onended = function() {
			audio.$destroy = true;
			self.cleaner();
		};

		audio.onerror = function() {
			audio.$destroy = true;
			self.cleaner();
		};

		audio.onabort = function() {
			audio.$destroy = true;
			self.cleaner();
		};

		self.items.push(audio);
		return self;
	};

	self.cleaner = function() {
		var index = 0;
		while (true) {
			var item = self.items[index++];
			if (item === undefined)
				return self;
			if (!item.$destroy)
				continue;
			item.pause();
			item.onended = null;
			item.onerror = null;
			item.onsuspend = null;
			item.onabort = null;
			item = null;
			index--;
			self.items.splice(index, 1);
		}
	};

	self.stop = function(url) {

		if (!url) {
			for (var i = 0; i < self.items.length; i++)
				self.items[i].$destroy = true;
			return self.cleaner();
		}

		var index = self.items.findIndex('src', url);
		if (index === -1)
			return self;

		self.items[index].$destroy = true;
		return self.cleaner();
	};

	self.setter = function(value) {

		if (value === undefined)
			value = 0.5;
		else
			value = (value / 100);

		if (value > 1)
			value = 1;
		else if (value < 0)
			value = 0;

		volume = value ? +value : 0;
		for (var i = 0, length = self.items.length; i < length; i++) {
			var a = self.items[i];
			if (!a.$destroy)
				a.volume = value;
		}
	};

});

COMPONENT('faviconunread', 'bg:red;fg:white', function(self, config) {

	var tmp = {};

	self.singleton();
	self.readonly();

	self.make = function() {
		var head = $(config.selector || document.head);
		tmp.el = config.selector ? head : head.find('link[rel="icon"]');

		if (!tmp.el.length) {
			head.append('<link rel="icon" href="data:image/gif;base64,R0lGODdhIAAgAIAAAP///wAAACwAAAAAIAAgAAACHoSPqcvtD6OctNqLs968+w+G4kiW5omm6sq27gubBQA7" type="image/gif" />');
			tmp.el = head.find('link[rel="icon"]');
		}

		tmp.href = tmp.el.attr('href') || tmp.el.attr('src');
		tmp.type = tmp.el.attr('type');
	};

	self.setter = function(value) {

		if (!value) {
			tmp.el.attr({ type: tmp.type, href: tmp.href });
			return;
		}

		var canvas = document.createElement('canvas');
		var img = new Image();
		img.src = tmp.href;
		img.onload = function() {
			canvas.width = img.width;
			canvas.height = img.height;
			var ctx = canvas.getContext('2d');
			ctx.drawImage(img, 0, 0);
			ctx.fillStyle = config.bg;
			var size = img.width / 3.4;
			ctx.arc(img.width - size, img.height - size, size, 0, 2 * Math.PI);
			ctx.fill();
			ctx.textAlign = 'center';
			ctx.fillStyle = config.fg;
			ctx.font = 'bold 12px Arial';
			if (value > 99)
				value = '99';
			else
				value += '';

			ctx.fillText(value, img.width - size, img.height - 5);

			if (config.selector)
				tmp.el.attr('src', canvas.toDataURL());
			else
				tmp.el.attr({ type: 'image/png', href: canvas.toDataURL() });

			canvas = img = null;
		};
	};

});
