//导入3tee sdk后，定义变量，用于调用接口
var AVDEngine = ModuleBase.use(ModulesEnum.avdEngine);
var avdEngine = new AVDEngine();
avdEngine.initDevice(); //初始化设备

//获取url中的各个参数
var serverURI = GetQueryString("serverURI");
var accessToken = GetQueryString("accessToken");
var roomId = GetQueryString("roomId");
var userId = GetQueryString("userId");
var userName = GetQueryString("userName");

$("#showUserName").html("当前用户:" + userName);

var joinRoomBtn = document.getElementById("joinRoomBtn");
var leaveRoomBtn = document.getElementById("leaveRoomBtn");
var userListUl = document.getElementById("userList");

//记录操作是否完成的变量
var joinRoomSuccess = false;

//设置日志级别，初始化
avdEngine.setLog(Appender.browserConsole, LogLevel.error);
avdEngine.init(serverURI, accessToken).then(initSuccess).otherwise(showError);

function initSuccess() {}

//加会
function joinRoom() {
	room = avdEngine.obtainRoom(roomId);
	showResult('加会中', 'blue');
	room.join(userId, userName, '', '').then(joinSuccess).otherwise(showError);
}

//加会成功操作，包括设置房间级别的回调和会议中所有用户的回调
function joinSuccess() {
	showResult('加会成功', 'blue');
	joinRoomSuccess = true;
	registerRoomCallback();
 	participantsHandle(room.getParticipants());

	leaveRoomBtn.style.display = "inline";
	joinRoomBtn.style.display = "none";
}

/**
 * 注册房间级别的回调
 */
function registerRoomCallback() {
	room.addCallback(RoomCallback.user_join_notify, onUserJoinNotify);
	room.addCallback(RoomCallback.user_leave_notify, onUserLeaveNotify);
	
    room.addCallback(RoomCallback.public_message, onPublicMessage);
	room.addCallback(RoomCallback.private_message, onPrivateMessage);
	room.addCallback(RoomCallback.public_data, onPublicData);
	room.addCallback(RoomCallback.private_data, onPrivateData);
}

/**
 * @desc 参会者加会回调
 * @param {Object} users － 参会者数组
 */
function onUserJoinNotify(users) {
	participantsHandle(users);
}

/**
 * @desc 参会者退会回调
 * @param {int} opt - 退会类型
 * @param {int} reason  - 退会原因
 * @param {Object} user - 退会用户
 */
function onUserLeaveNotify(opt, reason, user) {
	//服务器端报807错误，说明UDP不通或UDP连接超时
	if(reason == 807 && user.id == room.selfUser.id) {
		showResult("807错误，UDP不通或UDP连接超时！", 'red');
		return;
	}else{
		participantsHandle(user,true);
	}
}

/**
 * 公有透明通道回调
 * @param {Object} dataArrayBuffer － DataArrayBuffer对象
 * @param {String} userId － user id
 */
function onPublicData(dataArrayBuffer, userId) {
	fillDataElement(dataArrayBuffer,userId);
}


/**
 * 私有透明通道回调
 * @param {Object} dataArrayBuffer － DataArrayBuffer对象
 * @param {String} userId － user id
 */
function onPrivateData(dataArrayBuffer, userId) {
	fillDataElement(dataArrayBuffer,userId);
}


function fillDataElement(dataArrayBuffer,userId){
	var content = typeConversionUtil.ArrayBuffer2String(dataArrayBuffer);
	var val = document.getElementById('dataColl').innerHTML;
	var prefix = "";
	if (!strUtil.isEmpty(val)) {
		prefix = "\r\n";
	}
	val += prefix + room.getUser(userId).name + "：" + content;
	document.getElementById("dataColl").innerHTML = val;
}

/**
 * 公聊回调
 * @param {Object} Message
 */
function onPublicMessage(Message) {
	fillMessageElement(Message);
}


/**
 * 私聊回调
 * @param {Object} Message
 */
function onPrivateMessage(Message) {
	fillMessageElement(Message);
}


function fillMessageElement(Message) {
    var timestamp =Message.timestamp;
    var dt = new Date(timestamp);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset()); // 当前时间(分钟) + 时区偏移(分钟)
	console.log( "内容收到时间（本地时间）: ", dt.toLocaleString());
	
	var val = document.getElementById('messageColl').innerHTML;
	var prefix = "";
	if (!strUtil.isEmpty(val)) {
		prefix = "\r\n";
	}
	val += prefix + Message.fromName + "：" + Message.message;
	document.getElementById("messageColl").innerHTML = val;
}

//遍历房间用户列表
function participantsHandle(participants,isLeave) {
	if(isLeave){
		var userList = userListUl.getElementsByTagName("li");
		for(var i = 0; i<userList.length; i++){
			if(userList[i].getAttribute("userId") == participants.id){
				userListUl.removeChild(userList[i]);
				return;
			}
		}
	}else{
		participants.forEach(function(user) {
			if(user.id == room.selfUser.id){
			}else{
				var listLi = document.createElement("li");
				listLi.innerHTML = user.name;
				listLi.setAttribute("userId",user.id);
				userListUl.appendChild(listLi);
			}
		});
	}
}

/**
 * 发送聊天信息
 */
function messageSend() {
	if(!room){
		showResult("请加入房间", "red");
		return
	}
	var messageUserId = $("#userList .current").attr("userId")?$("#userList .current").attr("userId"):"";
	var message = document.getElementById('message').value;
	if (strUtil.isEmpty(message)) {
		return;
	} else {
		if (strUtil.isEmpty(messageUserId)) {
			  room.sendPublicMessage(message).then(messageSendSuccess(message)).otherwise(messageSendError);
		} else {
			  room.sendPrivateMessage(message, messageUserId).then(messageSendSuccess(message)).otherwise(messageSendError);
		}
	}
}

function messageSendSuccess(message){
	    var val = document.getElementById('messageColl').innerHTML;
		var prefix = "";
		if (!strUtil.isEmpty(val)) {
			prefix = "\r\n";
		}
		val += prefix + room.selfUser.name + "：" + message;
		document.getElementById("messageColl").innerHTML = val;
		document.getElementById('message').value = "";
		document.getElementById('message').focus();
}

function messageSendError(error){
	 document.getElementById("messageColl").innerHTML = "发送聊天信息失败！" + error.errorShow();
}

/**
 * 透明通道发送
 */
function dataSend() {
	if(!room){
		showResult("请加入房间", "red");
		return
	}
	var dataUserId = $("#userList .current").attr("userId")?$("#userList .current").attr("userId"):"";
	var dataMsg = document.getElementById('dataMsg').value;
	if (strUtil.isEmpty(dataMsg)) {
		return;
	} else {
		var dataArrayBuffer = typeConversionUtil.String2ArrayBuffer(dataMsg);
		if (strUtil.isEmpty(dataUserId)) {
			room.sendPublicData(dataArrayBuffer).then(dataSendSuccess(dataMsg)).otherwise(dataSendError);
		} else {
			room.sendPrivateData(dataArrayBuffer,dataUserId).then(dataSendSuccess(dataMsg)).otherwise(dataSendError);
		}
	}
}

function  dataSendSuccess(dataMsg){
    var val = document.getElementById('dataColl').innerHTML;
	var prefix = "";
	if (!strUtil.isEmpty(val)) {
		prefix = "\r\n";
	}
	val += prefix + room.selfUser.name + "：" + dataMsg;
	document.getElementById("dataColl").innerHTML = val;
	document.getElementById('dataMsg').value = "";
	document.getElementById('dataMsg').focus();
}

function dataSendError(error){
	 document.getElementById("dataColl").innerHTML = "透明通道发送信息失败！" + error.errorShow();
}

//离会
leaveRoomBtn.onclick = function() {
	room.leave(1).then(function() {
		joinRoomSuccess = false;
		location.reload();
	});
}

//获取访问URL的参数
function GetQueryString(name) {
	var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
	var r = window.location.search.substr(1).match(reg);
	if(r != null) {
		return unescape(r[2]);
	}
	return null;
}

//统一日志显示，在页面最下方显示步骤进度
function showResult(content, color) {
	var myDate = new Date();
	var currentTime = changeTimeFromat(myDate.getHours()) + ":" + changeTimeFromat(myDate.getMinutes()) + ":" + changeTimeFromat(myDate.getSeconds());
	var showContent = currentTime + " " + content;
	showContent = "<span style='color:" + color + "'>" + showContent + "</span>";
	$("#logShow").html($("#logShow").html() + showContent + "<br>");
	$("#jp-container").scrollTop($('#jp-container')[0].scrollHeight);
}

function changeTimeFromat(time) {
	if(time < 10) {
		return "0" + time;
	}
	return time;
}
/**
 * 字符串相关处理
 */
var strUtil = {
    /*
     * 判断字符串是否为空
     * @param str 传入的字符串
     * @returns {}
     */
    isEmpty:function(str){
        if(str != null && str.length > 0){
            return false;
        }else{
            return true;
        }
    }
}


/**
 * 返回当前用户所显示的格式的当前时间
 * @returns {string}
 */
function getCurrentTime(stamp) {
    var now     = (stamp? new Date(stamp): new Date());
    var hour    = now.getHours();
    var minute  = now.getMinutes();
    var second  = now.getSeconds();
    if(hour.toString().length === 1) {
        hour = '0'+hour;
    }
    if(minute.toString().length === 1) {
        minute = '0'+minute;
    }
    if(second.toString().length === 1) {
        second = '0'+second;
    }
    return hour+':'+minute+':'+second;
}
//错误统一处理
function showError(error) {
	showResult("code:" + error.code + " ;  message:" + error.message, 'red');
}

//添加左侧列表事件监听
$("#userList").on("click","li",function(){
	$(this).addClass("current").siblings().removeClass("current");
})
