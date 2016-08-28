/*
 * thResizer 旨在应用于 table 表格，并可响应用户对表头的拖拽操作而改变列宽。 
 * 注意： 如果想在其他项目引用该插件，请记得加上样式：.th-resizing,.first-resize-th,.second-resize-th{ cursor: col-resize; }
 * Author: Joker 2016-08-28
 * version: 0.0.1
 * */

; (function ($, window, document, undefined) {
	
	var thResizer = function ( options )
	{
		//这个变量用于计算函数递归调用的次数，应用场景是：我们需要确保在表格加载出来之后，再对表头注册相关的事件，
		//所以需要每隔一段时间去尝试执行事件注册函数，直到注册上为止，或者给定次数上限，超过这个次数就不再注册，然后在控制台输出类似“time out”提示。
		this.counter = 0;
		
		//对于不同页面结构，可能要通过不同的selector去定位目标对象，有时候是$("th"),有时候也可能是$(".datatable th")等等...
		this.objStr = "th";
		
		//vaw表示有效区域宽度，如果设置为5，则在th与th的边界处前后5px（共10px）的区域内都可以启动战斗模式
		this.vaw = 5;
		
		//fd, free distance的缩写，表示在缩放列宽的时候，预留出的一个最小列宽，即表示列宽不能小于这个值了。
		this.fd = 15;
		
		//resizeLB (鼠标移动的极限左值，超过这个值，则不再改变列宽)   
		//resizeRB (鼠标移动的极限右值，超过这个值，则不再改变列宽)
		//resizeTW (前后两个th的总宽度)
		//firstLeft (第一个th的左偏移量)
		//mouseGap (鼠标相对于第一个th右边框的距离)
		this.resizeLB = -1;
		this.resizeRB = -1;
		this.resizeTW = -1;
		this.firstLeft = -1;
		this.mouseGap = -1;
		
		// 清除文本选中状态  
	    this.clearTxtSelect = "getSelection" in window ? function(){  
	        window.getSelection().removeAllRanges();  
	    } : function(){  
	        document.selection.empty();  
	    };  
		
		this.init( this );
	};

	//初始化
	thResizer.prototype.init = function( _this )
	{
		//如果函数轮询次数超过60次，则退出，不再轮询。
		if( _this.counter > 60 ){
			console.log("fnInitMouseMove 事件绑定超时 !");
			return;
		}
		
		_this.counter++;
		
		//如果页面找不到$("th")对象，则每隔500毫秒轮询一次。
		if( $(_this.objStr).length < 1 ){
			
			setTimeout(function(){
				_this.init( _this );		//递归调用
			},500);
		}
		else{
			_this.fnBindMouseEvents_th( _this );
			
			_this.fnBindMouseUp_body( _this );
			
			_this.fnBindMouseMove_body( _this );
		}
	}
	
	//给表头 th 元素解除绑定 mousemove 事件
	thResizer.prototype.fnUnbindMouseMove_th = function( _this )
	{
		$(_this.objStr).each(function(i,n){
			$(n).unbind("mousemove");
		});
	}
		
	//i: index,		n: item
	thResizer.prototype.fnBindMouseMove_th = function( _this, i, n )
	{
		$(n).bind("mousemove",function(e){
				
        	var rect = this.getBoundingClientRect();
        	
        	//如果鼠标移动到第一列的前部有效区域、或者最后一列的后部有效区域，则不允许启动战斗模式
        	if( (i == 0 && (rect.left + _this.vaw) > e.clientX) ||
        		(i == $(_this.objStr).length - 1) && (rect.right - _this.vaw) < e.clientX ){
    			return;
        	}
        		
			$(this).parent().children().removeClass("first-resize-th").removeClass("second-resize-th");
        		
    		if( (rect.left + _this.vaw) > e.clientX ){			//当鼠标移动到th前部的有效区域时...（一个th有前后两个有效区，分别位于前部5px和后部5px的区域）
    			
    			//这种情形下，把当前th标记为第二个待操作元素，而将它前面一个th标记为第一个待操作元素
    			$(this).prev().addClass("first-resize-th");
    			$(this).addClass("second-resize-th");
    		}
    		else if( (rect.right - _this.vaw) < e.clientX ){		//当鼠标移动到th后部的有效区域时...
    			
    			//这种情形下，把当前th存储为第一个待操作元素，而将它后面一个th存储为第二个待操作元素
    			$(this).addClass("first-resize-th");
    			$(this).next().addClass("second-resize-th");
    		}
      	});
	}
		
	//i: index,		n: item
	thResizer.prototype.fnBindMouseDown_th = function( _this, i, n )
	{
		$(n).bind("mousedown",function(e){
	      		
      		//当点击鼠标左键，并且鼠标此时处于有效区域，则正式进入战斗模式
      		if( e.button == 0 && ( $(this).hasClass("first-resize-th") || $(this).hasClass("second-resize-th") ) ){
      			
      			//给body添加th-resizing类，标志着正在进行列宽的拖拽改变操作中.
      			$("body").addClass("th-resizing");
      			
      			//给所有th解除 mousemove 事件
      			_this.fnUnbindMouseMove_th( _this );
      			
      			//计算出五个参数：1、鼠标移动的极限左值	2、鼠标移动的极限右值 	3、前后两个th的总宽度		4、第一个th的左偏移量		5、鼠标相对于第一个th右边框的距离
      			var rect1 = $(".first-resize-th").get(0).getBoundingClientRect();
      			var rect2 = $(".second-resize-th").get(0).getBoundingClientRect();
      			
				_this.mouseGap = rect1.right - e.clientX;
      			_this.resizeLB = rect1.left + _this.fd - _this.mouseGap;
				_this.resizeRB = rect2.right - _this.fd + _this.mouseGap;
				_this.resizeTW = rect2.right - rect1.left
				_this.firstLeft = rect1.left;

      		}
      	});
	}
		
	//绑定鼠标相关事件 （mousemove、mousedown）
	thResizer.prototype.fnBindMouseEvents_th = function( _this )
	{		
		$(_this.objStr).each(function(i,n){
			
			_this.fnBindMouseMove_th(_this, i, n);
	    			
	      	_this.fnBindMouseDown_th(_this, i, n);
		});
	}
		
	//绑定body的mouseup事件
	thResizer.prototype.fnBindMouseUp_body = function( _this )
	{
		$("body").bind("mouseup",function(){
				
			//给body去除th-resizing标记类
		    $("body").removeClass("th-resizing");
		    
			//TO DO,可以做其他一些reset的操作
		    
		    //给所有 th 恢复 mousemove 事件
		    _this.fnBindMouseEvents_th( _this );
		});
	}
		
	//绑定body的mousemove事件
	thResizer.prototype.fnBindMouseMove_body = function( _this )
	{
		$('body').bind('mousemove', function(e) {
			
			//如果body有th-resizing标记类，则说明正在进行列宽的拖拽改变操作.
			if( $("body").hasClass("th-resizing") ){
			
				// 清除文本选中状态  
				_this.clearTxtSelect();
				
				var _th1 = $(".first-resize-th");
				var _th2 = $(".second-resize-th");
				
				if( _th1.length < 1 || _th2.length < 1 )	return false;
				
				//如果鼠标在 “鼠标移动的极限左值” 和 “鼠标移动的极限右值” 之间移动，则改变鼠标所在的前后两个th的宽度。
				if( _this.resizeLB < e.clientX && e.clientX < _this.resizeRB ){
					
					//分别计算出改变宽度后的两个th的新宽度
					var new_W1 = e.clientX - _this.firstLeft + _this.mouseGap;
					var new_W2 = _this.resizeTW - new_W1;
					
					_th1.css("width", new_W1 + "px");
					_th2.css("width", new_W2 + "px");
				}
			}
		});
	}
	
 	// 防止多次实例化
    // 处理方法调用
	$.fn["thResizer"] = function ( options ) {
		
		var result;
		
		this.each(function () {
			if( (result = $.data(this, "thResizer")) == null )
				$.data(this, "thResizer", new thResizer( $.extend(true, {}, options) ) )
		});
		
        return result || this;
    };
	
})(jQuery, window, document);