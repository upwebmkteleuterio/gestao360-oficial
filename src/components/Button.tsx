import React from 'react';
import styled from 'styled-components';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const Button = ({ children, ...props }: ButtonProps) => {
  return (
    <StyledWrapper>
      <button className="Btn" {...props}>
        {children}
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .Btn {
    min-width: 130px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgb(15, 15, 15);
    border: none;
    color: white;
    font-weight: 600;
    gap: 8px;
    cursor: pointer;
    box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.103);
    position: relative;
    overflow: hidden;
    transition-duration: .3s;
    padding: 0 16px;
  }

  /* SVG icon support if passed inside children */
  .Btn svg {
    width: 16px;
    fill: white;
  }

  .Btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .Btn::before {
    width: 100%;
    height: 130px; /* High enough to cover on transform */
    position: absolute;
    content: "";
    background-color: white;
    border-radius: 50%;
    left: -100%;
    top: 0;
    transition-duration: .3s;
    mix-blend-mode: difference;
  }

  .Btn:hover:not(:disabled)::before {
    transition-duration: .3s;
    transform: translate(100%,-50%);
    border-radius: 0;
  }

  .Btn:active:not(:disabled) {
    transform: translate(5px,5px);
    transition-duration: .3s;
  }
`;

export default Button;
