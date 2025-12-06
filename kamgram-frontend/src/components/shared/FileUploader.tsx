import { useCallback, useState } from 'react';
import { FileWithPath, useDropzone } from 'react-dropzone';
import { Button } from '../ui/button';

type FileUploaderProps = {
  fieldChange: (FILES: File[]) => void;
  mediaUrl?: string;
}

const FileUploader = ({ fieldChange, mediaUrl }: FileUploaderProps) => {
  const [file, setFile] = useState<File[]>([]);
  const [fileUrl, setFileUrl] = useState(mediaUrl);

  const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
    setFile(acceptedFiles);
    fieldChange(acceptedFiles);
    setFileUrl(URL.createObjectURL(acceptedFiles[0])); //first file 0
  }, [file])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.svg'],
    }
  });

  return (
    <div {...getRootProps()} className='flex flex-center flex-col bg-white rounded-xl cursor-pointer'>
      <input {...getInputProps()} className="cursor-pointer" />
      {
        fileUrl ? (
          <>
          <div className="flex flex-1 justify-center w-full p-5 lg:p-10">
            <img 
              src={fileUrl}
              alt="image"
              className="file_uploader-img"
            />
          </div>
          <p className='file_uploader-label2'>Click or drag photo to replace</p>
          </>
        ) : (
          <div className="file_uploader-box">
            <img 
              src="/assets/icons/file-upload2.svg"
              width={96}
              height={77}
              alt="file-upload"
            />

            <h3 className='base-medium text-black mb-2 mt-6'>Drag photo here</h3>
            <p className="text-black small-regular mb-6">SVG, PNG, JPG</p>

            <Button className='shad-button_light'>
              Select from computer
            </Button>
          </div>
        )
      }
    </div>
  )
}

export default FileUploader