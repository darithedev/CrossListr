import { describe, it, expect, beforeAll } from 'vitest'

describe('Check the health of backend server', () => {
    let response, data;

    beforeAll(async () => {
        response = await fetch('http://localhost:3000/health');
        data = await response.json();
    });

    it('Returns a response code of 200', () => {
        expect(response.status).toBe(200);
    });

    it('Returns a message for healthy server', async () => {
        expect(data).toStrictEqual({
            database: "up",
            message: "Express server is healthy. Postgres database connection is healthy.",
            server: "up",
        })
    })

    it('Return message is an obj', () => {
        expect(data).toBeTypeOf('object');
    })
});