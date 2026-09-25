import { signal } from "@angular/core";
import { User } from "./interfaces/user";

export let user = signal<User | null>(null);

export function setUser(newUser: User | null) {
    if (newUser === null) {
        localStorage.removeItem('user');
        user.set(null);
        return;
    }
    localStorage.setItem('user', JSON.stringify(newUser));
    user.set(newUser);
}

export function getUser(): User | null {
    if (user() !== null) {
        return user();
    }
    const userData = localStorage.getItem('user');
    if (userData) {
        const parsedUser = JSON.parse(userData);
        user.set(parsedUser);
        return parsedUser;
    }
    return null;
}