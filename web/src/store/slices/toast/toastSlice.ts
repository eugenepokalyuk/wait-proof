import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';

export interface Toast {
  id: string;
  text: string;
  tone: 'default' | 'error' | 'success';
}

const toastSlice = createSlice({
  name: 'toast',
  initialState: [] as Toast[],
  reducers: {
    shown: {
      reducer(state, { payload }: PayloadAction<Toast>) {
        // Больше двух тостов разом не читает никто
        state.push(payload);
        if (state.length > 2) state.shift();
      },
      prepare(text: string, tone: Toast['tone'] = 'default') {
        return { payload: { id: nanoid(), text, tone } };
      },
    },
    dismissed(state, { payload }: PayloadAction<string>) {
      return state.filter((t) => t.id !== payload);
    },
  },
});

export const toastActions = toastSlice.actions;
export const toastReducer = toastSlice.reducer;
