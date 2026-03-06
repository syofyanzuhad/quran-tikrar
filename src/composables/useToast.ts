import { ref } from 'vue';

export interface ToastMessage {
    id: string;
    message: string;
    type?: 'success' | 'info' | 'error';
}

const toasts = ref<ToastMessage[]>([]);

export function useToast() {
    function addToast(message: string, type: 'success' | 'info' | 'error' = 'success', duration = 3000) {
        const id = Math.random().toString(36).substring(2, 9);
        toasts.value.push({ id, message, type });
        setTimeout(() => {
            removeToast(id);
        }, duration);
    }

    function removeToast(id: string) {
        const index = toasts.value.findIndex(t => t.id === id);
        if (index > -1) {
            toasts.value.splice(index, 1);
        }
    }

    return {
        toasts,
        addToast,
        removeToast
    };
}
