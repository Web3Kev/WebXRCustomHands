# Custom hands in R3F, XR

This template provides a minimal setup to get a set of WebXR hands with a custom shader that looks like Meta's default hands.

![demo](https://github.com/user-attachments/assets/cbd29356-8d52-48b2-a924-8175fa216782)
![0220](https://github.com/user-attachments/assets/07662eb5-bec5-4901-9e15-80e44c4cc9c2)

The model is the default model with a rewrap of its UV, so that they align from finger tips to wrist.

This enables us to apply a color gradient as well as an opacity gradient to "erase" the wrists.

You can dynamically change the shader's uniforms like so :

main shader:
`customShaderMaterialRef.current.uniforms.globalOpacity.value = eventOccurred ? 1 : 0;` 

outline :
`outlineMaterialRef.current.uniforms.globalOpacity.value = eventOccurred ? 1 : 0;`

live link: https://webxr-custom-hands.vercel.app/

Open in Meta Quest https://www.oculus.com/open_url/?url=https%3A%2F%2Fwebxr-custom-hands.vercel.app
