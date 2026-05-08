it("should process animation nodes via SAM API", async () => {
    const response = await fetch("http://127.0.0.1:3000/migrate/animations", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify([
            { name: "TestAnimation1", primaryPoseType: "POSE_1" },
            { name: "TestAnimation2", primaryPoseType: "POSE_2" },
        ]),
    });

    const body : any = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
}, 1000000);