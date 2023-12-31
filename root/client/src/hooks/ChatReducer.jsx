import { ACTION_TYPES } from "./postActionTypes";

export const INITIAL_STATE = {
  chatId: "null",
  user: {},
  group: {},
};

export const chatReducer = (state, action, currentUser) => {
  switch (action.type) {
    case ACTION_TYPES.CHANGE_USER:
      return {
        user: action.payload,
        group: {},
        chatId:
          currentUser.uid > action.payload.uid
            ? currentUser.uid + action.payload.uid
            : action.payload.uid + currentUser.uid,
      };
    case ACTION_TYPES.CHANGE_GROUP:
      return {
        user: {},
        group: action.payload,
        chatId: action.payload.groupId,
      };
    case ACTION_TYPES.RESET_CHAT:
      return INITIAL_STATE;
    default:
      return state;
  }
};