import { google, drive_v3 } from 'googleapis';

const googleAuth = new google.auth.JWT({
    //email: "ejegong-creator-worker@ejegong-creator-ai.iam.gserviceaccount.com",
    key: "./config/google_service_account.json",
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const googleDrive = google.drive({ version: 'v3', auth: googleAuth });

export async function uploadWithPermissionsAnyone(fileName:string, body:any, mimeType:string): Promise<string|null|undefined>{
    const fileMetadata: drive_v3.Schema$File = {
        parents: ["1jq5P4bgpHKpd-j5H4p5QRWIwYBQ4LevT"],
        name: fileName,
        permissions: [{
            type: 'anyone',
            role: 'reader',
        }]
    };
    
    const uploadedFile = await googleDrive.files.create({
        requestBody: fileMetadata,
        media: {
            body: body,
            mimeType: mimeType
        },
        fields: 'id,webViewLink',
    });
    if(uploadedFile.status != 200){
        return undefined;
    }

    // // 파일에 대한 공유 권한 추가 (Anyone with the link can view)
    // const permResult = await drive.permissions.create({
    //     fileId: uploadedFile.data.id!,
    //     requestBody: {
    //         role: 'reader',
    //         type: 'anyone',
    //     }
    // });

    return uploadedFile.data.id;
}
